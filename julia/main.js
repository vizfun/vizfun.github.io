function main(evt) {
    let gl;
    let canvas;
    let program;
    let buffer;
    let clientX = 0;
    let clientY = 0;
    
    let iResolution;
    let iTime;
    let iJulia;
    let iCursorPos;
    
    let startTime = Date.now() / 1000;
    let julia = false;
    let juliaF = 1.0;
    let lastFrameTime = performance.now() / 1000;
    const dpr = devicePixelRatio;
    
    {
        setupWebGL();
        frame();
        canvas = document.querySelector('canvas');
        canvas.addEventListener('mousemove', e => { if (!julia) { return; } clientX=e.clientX * dpr; clientY=e.clientY * dpr; });
        document.addEventListener('mousedown', e => { julia = true; clientX=e.clientX * dpr; clientY=e.clientY * dpr; hideTutorial(); });
        document.addEventListener('mouseup', () => julia = false);
        canvas.addEventListener('touchstart', e => { julia = true; hideTutorial(); const touch = e.touches[0]; if (!touch) { return; } clientX = touch.clientX * dpr; clientY = touch.clientY * dpr; } );
        canvas.addEventListener('touchend', e => { if (!e.touches.length) { julia = false } });
        canvas.addEventListener('touchmove', e => { if (!julia) { return; } const touch = e.touches[0]; if (!touch) { return; } clientX = touch.clientX * dpr; clientY = touch.clientY * dpr; });
        window.addEventListener('resize', handleResize);
        document.addEventListener('load', handleResize);
        setTimeout(handleResize, 100);
    
        canvas.addEventListener('touchstart', () => canvas.requestFullscreen());
    }
    
    function easeInOutCubic(t) {
        return t<.5 ? 4*t*t*t : (t-1)*(2*t-2)*(2*t-2)+1;
    }
    
    function frame() {
        if (gl) {
            let now = performance.now() / 1000;
            gl.uniform1f(iTime, Date.now() / 1000 - startTime);
            gl.uniform2f(iCursorPos, clientX, clientY);
            juliaF += (julia ? 1 : -1) * (now-lastFrameTime);
            juliaF = Math.min(1, Math.max(0, juliaF))
            gl.uniform1f(iJulia, easeInOutCubic(juliaF));
            gl.uniform2f(iResolution, canvas.width, canvas.height);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
            lastFrameTime = now;
        }
    
        requestAnimationFrame(frame);
    }
    
    function hideTutorial() {
        const tutorial = document.getElementById('tutorial');
        if (tutorial) {
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
    
    function setupWebGL () {
        /* getRenderingContext */
        canvas = document.querySelector("canvas");
        gl = canvas.getContext("webgl");
        handleResize();
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
    
        let vertexSource = document.querySelector("#vertex-shader").innerHTML;
        let vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, vertexSource);
        gl.compileShader(vertexShader);
        console.log("vertex shader compilation\n" + gl.getShaderInfoLog(vertexShader));
        
        let fragmentSource = document.querySelector("#fragment-shader").innerHTML
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
    
}

if (document.readyState === "complete" || document.readyState === "loaded" || document.readyState === 'interactive') {
    main();
} else {
    document.addEventListener('DOMContentLoaded', main);
}
