#version 100
attribute vec2 aPos;

void main() {
    gl_Position = vec4(aPos.x, aPos.y, 0.0, 1.0);

    gl_PointSize = 64.0;
}