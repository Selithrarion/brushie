#include ../../../../../shared/shaders/color.glsl
#include ../../../../../shared/shaders/gamma.glsl

uniform sampler2D brushTexture;
uniform sampler2D paperTexture;

uniform int uBrushCount;
uniform float uBrushPositions[MAX_BRUSHES * 2];
uniform float uBrushScales[MAX_BRUSHES];
uniform float uBrushOpacities[MAX_BRUSHES];
uniform float uBrushBaseColors[MAX_BRUSHES * 3];
uniform float uBrushAngles[MAX_BRUSHES];
uniform float uColorShiftAmount;

uniform bool uIsLocked;

uniform bool uEnableJelly;
uniform float uCornerRadius;
uniform vec2 uVelocity;
uniform float uRotation;

uniform float uGlobalOpacity;

uniform float uDropRadius;
uniform vec3 uDropColor;
uniform float uDropProgress;
uniform float uDropFadeOut;

varying vec2 vUv;

vec3 overlay(vec3 base, vec3 blend) {
	return mix(2.0 * base * blend, 1.0 - 2.0 * (1.0 - base) * (1.0 - blend), step(0.5, base));
}

vec2 rotateVector(vec2 v, float angle) {
	float cosA = cos(angle);
	float sinA = sin(angle);
	return vec2(
		v.x * cosA - v.y * sinA,
		v.x * sinA + v.y * cosA
	);
}
vec2 rotateUV(vec2 uv, float angle) {
	float cosA = cos(angle);
	float sinA = sin(angle);
	uv -= 0.5;
	vec2 rotatedUV = vec2(
		uv.x * cosA - uv.y * sinA,
		uv.x * sinA + uv.y * cosA
	);
	return rotatedUV + 0.5;
}

float sdJellyBox(vec2 p, vec2 dir, float stretch) {
	vec2 b = vec2(0.5);
	float factor = smoothstep(0.0, 1.0, dot(normalize(p), normalize(dir)));
	p += dir * factor * stretch;
	vec2 q = abs(p) - b + vec2(uCornerRadius);
	return length(max(q, 0.0)) - uCornerRadius;
}

void main() {
	//	TODO: add ellipse support?

	//	jelly alpha
	vec2 dir = normalize(uVelocity + 1e-5);
	float stretch = clamp(length(uVelocity) * 0.6, 0.0, 0.3);
	float box = sdJellyBox(vUv - 0.5, rotateVector(dir, -uRotation), stretch);
	float smoothing = fwidth(box);
	float jellyAlpha = (!uEnableJelly || length(uVelocity) < 0.01) ? 1.0 : smoothstep(0.0, smoothing, -box);

	// jelly uv
	vec2 distortedUv = vUv;
	if (uEnableJelly && length(uVelocity) > 0.001) {
		float factor = smoothstep(0.0, 1.0, dot(normalize(vUv - 0.5), dir));
		distortedUv += dir * factor * stretch;
	}

	//	painterly
	float alpha = 0.0;
	vec3 finalColor = vec3(0.0);
	for (int i = 0; i < MAX_BRUSHES; i++) {
		if (i >= uBrushCount) break;

		vec2 pos = vec2(uBrushPositions[i * 2], uBrushPositions[i * 2 + 1]);
		float scale = uBrushScales[i];
		float opacity = uBrushOpacities[i];

		vec2 uvLocal = rotateUV((distortedUv - pos) / scale + 0.5, uBrushAngles[i]);
		vec4 brushSample = texture2D(brushTexture, uvLocal);

		float dist = length(uvLocal - vec2(0.5));
		float edgeFade = smoothstep(0.52, 0.48, dist);
		brushSample.a *= edgeFade;

		if (brushSample.a < 0.01) continue;

		vec3 shiftedColorSrgb = vec3(uBrushBaseColors[i * 3], uBrushBaseColors[i * 3 + 1], uBrushBaseColors[i * 3 + 2]);
		shiftedColorSrgb = applyColorShift(shiftedColorSrgb, uColorShiftAmount);
		vec3 shiftedColor = srgbToLinear(shiftedColorSrgb);

		vec3 srcColor = shiftedColor * brushSample.a * opacity;
		float srcAlpha = brushSample.a * opacity;

		finalColor = finalColor * (1.0 - srcAlpha) + srcColor;
		alpha = alpha + srcAlpha * (1.0 - alpha);
	}

	// paper
	vec3 paperColor = texture2D(paperTexture, distortedUv).rgb;
	vec3 paperColSmall = mix(vec3(0.5), paperColor, 0.15);
	finalColor = overlay(finalColor, paperColSmall);

	// drop effect
	vec3 dropColorLinear = srgbToLinear(uDropColor);
	float dropRadius = mix(0.0, 0.75, uDropProgress);
	float dist = distance(vUv, vec2(0.5));
	float dropMask = step(dist, dropRadius);
	vec3 dropBlend = mix(finalColor, dropColorLinear, dropMask * uDropFadeOut);
	finalColor = dropBlend;

	// alpha
	alpha = clamp(alpha * jellyAlpha * uGlobalOpacity, 0.0, 1.0);
	finalColor = clamp(finalColor, 0.0, 1.0);

	if (uIsLocked) {
		float gray = dot(finalColor, vec3(0.299, 0.587, 0.114));
		finalColor = mix(vec3(gray), finalColor, 0.5);
	}

	finalColor = linearToSrgb(finalColor);

	//	gl_FragColor = vec4(distortedUv, 0., 1.);
	gl_FragColor = vec4(finalColor, alpha);
}
