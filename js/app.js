/*
    Au chargement de la page le script va regarder si il y a des paths spéciaux
    Dans le cas ou il y a des paths spéciaux ils seront virtualizer
    Toutes les trois secondes un path aléatoire sera generer grace aux path virtualizer

    Une boucle sera cadencé a chaque fois que la page lancera une animation lors d'une itération on prendra le path avant animation le path apres animation
    le temps ecoulé et le temps de l'animation pour créer un path temporaire. Ce path sera réinjecter dans le path html.

*/

/**
 * Represents the regex for a path function composed of 2 values.
 */
const SVG_TWO_VALUE = /[A-Za-z] -?[0-9]\d*(\.\d+)? -?[0-9]\d*(\.\d+)?/g

/**
 * Serializes and stringify paths.
 */
class PathVirtualizer {
    /**
     * Virtualizes a normal path
     * @param {String} path string path
     * @returns virtualized path
     */
    static parse (path) {
        let parsed = path.match(SVG_TWO_VALUE)
        
        // virtualized path
        let pattern = []

        /*
            for each path found in parsed we split it and we push a new object in the virtualized path with the svg function informations
        */
        parsed.forEach(el => {
            let split = el.split(' ')
            pattern = [...pattern, ...[{
                type: split[0],
                x: parseInt(split[1]),
                y: parseInt(split[2])
            }]]
        })

        console.log(pattern)

        return pattern
    }

    /**
     * Returns a string path from a virtualized path
     * @param {Object} virtualizedPath virtualized path
     * @returns string path
     */
    static stringify (virtualizedPath) {
        let path = ''

        virtualizedPath.forEach(str => {
            path = `${path} ${str.type} ${str.x} ${str.y}`
        })

        return path
    }
}

/**
 * Manage the animation between two path.
 */
class PathHandler {
    /**
     * Initializes a new instance of PathHandler
     * @param {Object} currentPath current virtualized path
     * @param {Number} timeToComplete animation time
     */
    constructor (currentPath, timeToComplete) {
        this.currentPath = currentPath
        this.timeToComplete = timeToComplete
    }

    /**
     * Start a new path
     * @param {Object} nextPath path pattern
     */
    startNewPath (nextPath) {
        this.startTime = + new Date()
        console.log(this.currentPath)
        if (this.nextPath !== undefined) {
            this.currentPath = this.nextPath
        }
        console.log(this.currentPath)
        this.nextPath = nextPath

        setTimeout(_ => {
            if (this.getClampedProgress() >= 1) {
                this.dispatch(this.onPathFinished)
            }   
        }, this.timeToComplete)
    }

    /**
     * Get progress for this animation
     * @returns animation progress
     */
    getProgress () {
        return (+ new Date() - this.startTime) / this.timeToComplete
    }

    /**
     * Get progress for this animation (this value will always be between 0 and 1).
     * @returns clamped animation progress
     */
    getClampedProgress () {
        let progress = this.getProgress()
        return (progress < 0) ? 0 : (progress > 1) ? 1 : progress
    }

    /**
     * Returns the actual path
     * @returns actual path
     */
    getActualPath () {
        let progress = this.getClampedProgress()

        let newPath = []

        for (let i = 0; i < this.nextPath.length; i++) {
            let interpolationX = (this.nextPath[i].x - this.currentPath[i].x) * progress + this.currentPath[i].x
            let interpolationY = (this.nextPath[i].y - this.currentPath[i].y) * progress + this.currentPath[i].y

            newPath = [...newPath, ...[{
                type: this.nextPath[i].type,
                x: interpolationX,
                y: interpolationY
            }]]
        }

        return newPath
    }

    /**
     * Add a callback for when an animation is over.
     * @param {Function} callback 
     */
    addOnPathFinished (callback) {
        this.onPathFinished = callback
    }

    /**
     * Dispatch a given callback
     * @param {Function} callback callback to throw
     */
    dispatch (callback) {
        if (callback) {
            callback()
        }
    }
}

/**
 * Generates random paths from a pattern.
 */
class PathGenerator {
    /**
     * Initializes a new instance of PathGenerator with the pattern.
     * @param {Object} pattern virtualized path
     */
    constructor (pattern) {
        this.pattern = pattern
    }

    /**
     * Generates a random path from the pattern
     * @returns {Array<Object>} random path
     */
    getRandomPath () {
        let newPattern = []

        this.pattern.forEach(el => {

            let x = el.x
            let y = el.y

            if (el.mode === 'dynamic') {
                let randomX = Math.random() * (el.interval * 2) - el.interval
                let randomY = Math.random() * (el.interval * 2) - el.interval

                x += randomX
                y += randomY
            }

            let temp = {
                type: el.type,
                x,
                y
            }

            newPattern = [...newPattern, ...[temp]]
        })

        return newPattern
    }
}

/**
 * Manipulates path attribute on a HTLM path element.
 */
class PathInjector {
    /**
     * Initializes a new instance of PathInjector with the element to manipulate.
     * @param {HTMLElement} element HTML Path element
     */
    constructor(element) {
        this.element = element
    }

    /**
     * Gets the path from the HTML path element
     * @returns {string} path
     */
    getPath () {
        let path = this.element.getAttribute('d')
        return path
    }

    /**
     * Sets the path of the HTML path element
     * @param {string} path path to set
     */
    setPath (path) {
        this.element.setAttribute('d', path)
    }
}

/**
 * Manage a path animation
 */
class PathAnimator {
    /**
     * Initializes a new instance of PathAnimator.
     * @param {PathHandler} pathHandler path handler
     * @param {PathGenerator} pathGenerator path generator
     * @param {PathInjector} pathInjector path injector
     */
    constructor (pathHandler, pathGenerator, pathInjector) {
        this.pathGenerator = pathHandler
        this.pathHandler = pathHandler
        this.pathInjector = pathInjector
        this.animate()
    }

    /**
     * Start animation
     */
    animate () {
        this.pathInjector.setPath(PathVirtualizer.stringify(this.pathHandler.getActualPath()))

        requestAnimationFrame(this.animate.bind(this))
    }
}

const pathInjector = new PathInjector(document.querySelector('[path]'))

const virtualizedPath = PathVirtualizer.parse(pathInjector.getPath())
virtualizedPath[1] = {...virtualizedPath[1], ...{mode: 'dynamic', interval: 10}}
virtualizedPath[2] = {...virtualizedPath[2], ...{mode: 'dynamic', interval: 5}}

console.log(virtualizedPath)

const pathHandler = new PathHandler(
    virtualizedPath,
    3000
)

pathHandler.addOnPathFinished(_ => {
    console.log('finished')
    let rand = pathGenerator.getRandomPath()
    pathHandler.startNewPath(rand)
    console.log(rand)
})

pathHandler.startNewPath(virtualizedPath)

const pathGenerator = new PathGenerator(virtualizedPath)
const pathAnimator = new PathAnimator(pathHandler, pathGenerator, pathInjector)
