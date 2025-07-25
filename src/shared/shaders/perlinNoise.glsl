vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
float fade(float t){return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);}
float cnoise(vec2 P){
    vec2 Pi = floor(P);
    vec2 Pf = fract(P);
    vec4 ix = vec4(Pi.x, Pi.x + 1.0, Pi.x, Pi.x + 1.0);
    vec4 iy = vec4(Pi.y, Pi.y, Pi.y + 1.0, Pi.y + 1.0);
    vec4 i = permute(permute(ix) + iy);
    vec4 gx = fract(i * (1.0 / 41.0)) * 2.0 - 1.0;
    vec4 gy = abs(gx) - 0.5;
    vec4 tx = floor(gx + 0.5);
    gx = gx - tx;
    vec2 g00 = vec2(gx.x, gy.x);
    vec2 g10 = vec2(gx.y, gy.y);
    vec2 g01 = vec2(gx.z, gy.z);
    vec2 g11 = vec2(gx.w, gy.w);
    vec4 norm = 1.79284291400159 - 0.85373472095314 *
    vec4(dot(g00,g00), dot(g10,g10), dot(g01,g01), dot(g11,g11));
    g00 *= norm.x;
    g10 *= norm.y;
    g01 *= norm.z;
    g11 *= norm.w;
    float n00 = dot(g00, Pf);
    float n10 = dot(g10, Pf - vec2(1.0, 0.0));
    float n01 = dot(g01, Pf - vec2(0.0, 1.0));
    float n11 = dot(g11, Pf - vec2(1.0, 1.0));
    vec2 fade_xy = vec2(fade(Pf.x), fade(Pf.y));
    float n_x = mix(n00, n10, fade_xy.x);
    float n_y = mix(n01, n11, fade_xy.x);
    return 2.3 * mix(n_x, n_y, fade_xy.y);
}