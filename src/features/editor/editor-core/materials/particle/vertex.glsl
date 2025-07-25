attribute float aLifetime;
attribute vec3 aColor;
attribute float aSize;

varying float vAlpha;
varying vec3 vColor;

uniform float uPointSize;

void main() {
	vAlpha = aLifetime;
	vColor = aColor;
	gl_PointSize = aSize * uPointSize;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
