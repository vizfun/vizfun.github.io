#version 100
precision highp float;
#define initZoom 0.2
#define complexSquare(z) vec2(z.x*z.x-z.y*z.y, 2.*z.x*z.y)
#define AA 1.

uniform vec2 iResolution;
uniform vec2 iCursorPos;
uniform float iTime;
uniform float iJulia;

void main()
{
    vec2 middleCoord = gl_FragCoord.xy - .5*iResolution.xy;
    vec2 uv = middleCoord / max(iResolution.x, iResolution.y);
    vec2 middleCursor = iCursorPos - .5*iResolution.xy;
    vec2 cursorUv = middleCursor / max(iResolution.x, iResolution.y);
    float zoom = initZoom;// * pow(1.1, 60.*(1.-cos(iTime/10.)));
    cursorUv /= zoom;
    uv /= zoom;
    float pixelSize = 1. / zoom / max(iResolution.x, iResolution.y);
    //uv += vec2(-.549545157957,-.626413507396);
    //uv += vec2(-.24619, .75408);
    uv += vec2(-0.75, 0.0) * (1.0 - iJulia);
    cursorUv += vec2(-0.75, 0.0);

    
    vec3 fraccol = vec3(0.);
    for (float aaxn = 0.; aaxn < AA; ++aaxn) {
        for (float aayn = 0.; aayn < AA; ++aayn) {
            float iter;
            vec3 outcol = vec3(0.);
            vec2 aauv = uv + vec2(aaxn * pixelSize / AA, aayn * pixelSize / AA);
            vec2 add = iJulia * cursorUv + (1.0 - iJulia) * aauv;
            vec2 z = aauv;
            for (float i = 0.; i < 250.; ++i) {
                iter=i;
                vec2 tmp = complexSquare(z) + add;
                z = complexSquare(tmp) + add; // + vec2(0.004988, -0.824560);
                if (length(z) > 20.) { break; }
            }
            float contained = 1.-smoothstep(9.99, 10., length(z));
            outcol.b += contained;
            outcol += abs(fract(iter / 25. + vec3(0,1,2)/3. + .1*iTime)-.5)*2.;
            fraccol += outcol*(1.-contained);
        }
    }
    

    gl_FragColor = vec4(fraccol/AA/AA,1.0);
}