#include ../../../../../shared/shaders/random.glsl
#include ../../../../../shared/shaders/perlinNoise.glsl

uniform sampler2D tDiffuse;
uniform float uTime;
varying vec2 vUv;

vec3 posterize(vec3 c, float levels) {
	return floor(c * levels) / levels;
}

void main() {
	vec2 uv = vUv;

	float distFromCenter = distance(uv, vec2(0.5));
	float aberrationStrength = 0.003 * smoothstep(0.2, 0.7, distFromCenter);
	vec2 redUV = uv + vec2(aberrationStrength, 0.0);
	vec2 greenUV = uv;
	vec2 blueUV = uv - vec2(aberrationStrength, 0.0);
	vec3 baseColor = vec3(
		texture2D(tDiffuse, redUV).r,
		texture2D(tDiffuse, greenUV).g,
		texture2D(tDiffuse, blueUV).b
	);


	vec3 col = vec3(1.0);

	float scan = 0.97 + 0.04 * sin(uv.y * 800.0);
	col *= scan;

	vec3 vignetteColor = vec3(0.15, 0.1, 0.12);
	float dist = length(vUv - vec2(0.5));
	float vig = 1.0 - smoothstep(0.35, 0.95, dist);
	col = mix(col, vignetteColor, 1.0 - vig);

	float strength = 0.3;
	vec3 finalColor = baseColor * (1.0 - strength + col * strength);

	gl_FragColor = vec4(finalColor, texture2D(tDiffuse, vUv).a);
}
