(() => {
    let gl;
    let canvas;
    let program;
    let buffer;
    let clientX = 0;
    let clientY = 0;

    const zoom = 0.2;
    const mandelbrotOffset = [-0.75, 0];
    
    let iResolution;
    let iTime;
    let iJulia;
    let iCursorPos;
    
    let startTime = Date.now() / 1000;
    let julia = false;
    let juliaF = 1.0;
    let lastFrameTime = performance.now() / 1000;
    let isLocked = false;
    let isMouseDown = false;
    let targetHash = "";
    const dpr = devicePixelRatio;
    const supportsPointerLock = 'exitPointerLock' in document;

    const vertexShaderPromise = fetch('./vertex.glsl').then(res => res.text());
    const fragmentShaderPromise = fetch('./fragment.glsl').then(res => res.text());

    async function init() {
        canvas = document.querySelector('canvas');

        window.addEventListener('resize', handleResize);
        document.addEventListener('load', handleResize);
        // if css loads too late, canvas is not yet properly sized, the window load does seem to work.
        for (const delay in [100, 500, 1000, 2000]) {
            setTimeout(handleResize, delay);
        }

        canvas.addEventListener('mousedown', mouseDownHandler);
        canvas.addEventListener('mousemove', e => moveJulia({ x: e.clientX, y: e.clientY, deltaX: e.movementX, deltaY: e.movementY }));
        canvas.addEventListener('mouseup', mouseUpHandler);
        canvas.addEventListener('touchstart', touchStartHandler);
        canvas.addEventListener('touchmove', e => moveJulia({ x: e.touches[0].clientX, y: e.touches[0].clientY }));
        canvas.addEventListener('touchend', e => endJulia());
        canvas.addEventListener('contextmenu', contextMenuHandler);
        window.addEventListener('hashchange', hashChangeHandler);
        hashChangeHandler();

        canvas.addEventListener('touchstart', () => canvas.requestFullscreen());

        await setupWebGL();
        frame();
    }

    function mouseDownHandler(e) {
        if (!e.button) { // left click
            isMouseDown = true;
            startJulia({ x: e.clientX, y: e.clientY })
        } else if (e.button === 2) { // right click
            if (julia) {
                isLocked = true;
                e.preventDefault();
                if (supportsPointerLock) {
                    document.exitPointerLock();
                }
                location.hash = targetHash = `#${clientX},${clientY}`
            }
        }
    }

    function mouseUpHandler(e) {
        if (!e.button) { // left click
            isMouseDown = false;
            endJulia();
        }
    }

    function contextMenuHandler(e) {
        if (isMouseDown) {
            e.preventDefault();
        }
    }

    function touchStartHandler(e) {
        startJulia({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }

    function hashChangeHandler(e) {
        const hash = location.hash && location.hash.substr(1);
        if (!hash || '#' + hash === targetHash) {
            return;
        }
        const [x,y] = hash.split(',').map(a => parseFloat(a));
        if (!isFinite(x) || !isFinite(y)) {
            return;
        }
        clientX = x;
        clientY = y;
        julia = true;
        isLocked = true;
        hideTutorial({instant: true});
    }

    function convertXY(x, y) {
        const middleX = x - canvas.clientWidth / 2;
        const middleY = y - canvas.clientHeight / 2;
        [x,y] = convertRelativeXY(middleX, middleY);
        return [
            x + mandelbrotOffset[0],
            y + mandelbrotOffset[1]
        ];
    }

    function convertRelativeXY(x, y) {
        const maxRes = Math.max(canvas.clientWidth, canvas.clientHeight);
        return [
            x / maxRes / zoom,
            y / maxRes / zoom
        ];
    }

    function unlock() {
        isLocked = false;
        endJulia();
        location.hash = '';
    }

    function startJulia({x, y, b}) {
        if (isLocked) {
            unlock();
            return;
        }
        hideTutorial();
        julia = true;
        [clientX, clientY] = convertXY(x, y);
        if (supportsPointerLock) {
            canvas.requestPointerLock();
        }
    }
    function endJulia() {
        if (!julia || isLocked) {
            return;
        }

        julia = false;
        if (supportsPointerLock) {
            document.exitPointerLock();
        }
    }

    function moveJulia({x, y, deltaX, deltaY}) {
        if (!julia || isLocked || !canvas) {
            return;
        }

        // pointer lock
        if (deltaX !== undefined && deltaY !== undefined) {
            const [dx, dy] = convertRelativeXY(deltaX, deltaY);
            clientX += dx;
            clientY += dy;
        } else {
            [clientX, clientY] = convertXY(x, y);
        }
    }


    
    function easeInOutCubic(t) {
        return t<.5 ? 4*t*t*t : (t-1)*(2*t-2)*(2*t-2)+1;
    }
    
    function frame() {
        if (gl) {
            let now = performance.now() / 1000;
            gl.uniform1f(iTime, Date.now() / 1000 - startTime);
            gl.uniform2f(iCursorPos, clientX * dpr, clientY * dpr);
            juliaF += (julia ? 1 : -1) * (now-lastFrameTime);
            juliaF = Math.min(1, Math.max(0, juliaF))
            gl.uniform1f(iJulia, easeInOutCubic(juliaF));
            gl.uniform2f(iResolution, canvas.width, canvas.height);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
            lastFrameTime = now;
        }
    
        requestAnimationFrame(frame);
    }
    
    function hideTutorial({instant = false}={}) {
        const tutorial = document.getElementById('tutorial');
        if (!tutorial) {
            return;
        }
        if (instant) {
            tutorial.remove();
        } else {
            tutorial.classList.add('hidden');
        }
    }
    
    function cleanup() {
        if (gl) {
            gl.useProgram(null);
            if (buffer) {
                gl.deleteBuffer(buffer);
            }
            if (program) {
                gl.deleteProgram(program);
            }
        }
        gl = null;
    }
    
    function handleResize() {
        if (!gl || !canvas) {
            return;
        }
        canvas = document.querySelector("canvas");
        const newWidth = canvas.clientWidth * dpr;
        const newHeight = canvas.clientHeight * dpr;
        if (newWidth === canvas.width && newHeight === canvas.height) {
            return;
        }
        canvas.width = newWidth;
        canvas.height = newHeight;
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    }
    
    async function setupWebGL () {
        /* getRenderingContext */
        canvas = document.querySelector("canvas");
        gl = canvas.getContext("webgl");
        handleResize();
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
    
        let vertexSource = await vertexShaderPromise;
        let vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, vertexSource);
        gl.compileShader(vertexShader);
        console.log("vertex shader compilation\n" + gl.getShaderInfoLog(vertexShader));
        
        let fragmentSource = await fragmentShaderPromise;
        let fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, fragmentSource);
        gl.compileShader(fragmentShader);
        console.log("fragment shader compilation\n" + gl.getShaderInfoLog(fragmentShader));
        
        program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        gl.detachShader(program, vertexShader);
        gl.detachShader(program, fragmentShader);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            let linkErrLog = gl.getProgramInfoLog(program);
            console.log("link error log\n" + linkErrLog);
            return;
        }
    
        /* initializeAttributes */
        gl.enableVertexAttribArray(0);
        let buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([1, -1, -1, 1, 1, 1, 1, -1, -1, 1, -1, -1]), gl.STATIC_DRAW);
    
        gl.vertexAttribPointer(0, 1, gl.FLOAT, false, 0, 0);
        let position_attrib_location = gl.getAttribLocation(program, "aPos");
    
        gl.enableVertexAttribArray(position_attrib_location);
    
        gl.vertexAttribPointer(position_attrib_location, 2, gl.FLOAT, false, 0, 0);
    
        gl.useProgram(program);
        
        iResolution = gl.getUniformLocation(program, "iResolution");
        iCursorPos  = gl.getUniformLocation(program, "iCursorPos");
        iTime       = gl.getUniformLocation(program, "iTime");
        iJulia       = gl.getUniformLocation(program, "iJulia");
        
    }

    if (document.readyState === "complete" || document.readyState === "loaded" || document.readyState === 'interactive') {
        init();
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }
})();
