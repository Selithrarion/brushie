varying vec2 vUv;

void main() {
	vec3 blue = vec3(0.86, 0.92, 0.996);  // #DBEAFE
	vec3 pink = vec3(0.99, 0.91, 0.95);   // #FCE7F3
	vec3 green = vec3(0.82, 0.98, 0.90);  // #D1FAE5

	vec2 uv = vec2(vUv.x, 1.0 - vUv.y); // br
	float grad = (uv.x + uv.y) * 0.5;

	vec3 col;
	if (grad < 0.5) {
		float t = smoothstep(0.0, 0.5, grad);
		col = mix(blue, pink, t);
	} else {
		float t = smoothstep(0.5, 1.0, grad);
		col = mix(pink, green, t);
	}

	gl_FragColor = vec4(col, 1.0);
}
