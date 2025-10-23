

// ~~vertexShader~~
precision highp float;

uniform vec3 uLightDir;
uniform mat4 modelMatrixInverse;

attribute vec3 iPosition;
attribute vec3 iNormal;
attribute vec3 iColor;

varying vec3 vNorm;     // Provided normal of point
varying vec3 sNorm;     // Normal of sphere shape
varying vec3 vLightDir; // Direction to light source
varying vec3 vColor;    // Provided color of point

void main() {
    vNorm = normalize(iNormal);
    sNorm = normalize(normal);
    vColor = iColor;
    vLightDir = normalize((modelMatrixInverse * vec4(uLightDir, 0.0)).xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4( iPosition + position, 1.0 );
}

// ~~fragmentShader~~
float lerp(float a, float b, float t) {
    return a + (b - a) * t;
}

precision highp float;

uniform vec3 uColor;    // Default color if no per-point color is provided
uniform float ambient; // ambient light intensity
uniform float lightIntensity; // directional light intensity
uniform int mode; // bit 0: 1 = use point color attribute, 0 = use default color uniform
                  // bit 1: 1 = use atribute and sphere normals, 0 = use sphere normals only

varying vec3 vNorm;     // Provided normal of point
varying vec3 sNorm;     // Normal of sphere shape
varying vec3 vLightDir; // Direction to light source
varying vec3 vColor;    // Provided color of point

void main() {
    float vnInt = ((mode & 1) == 0) ? lightIntensity : lerp(ambient, lightIntensity, clamp(dot(vNorm, vLightDir), 0.0, 1.0));

    float snInt = (1.0 + round(max(dot(sNorm, vLightDir), 0.0) * 2.0)) / 3.0; 
    float lInt = vnInt * snInt;

    vec4 shadedColor = vec4(0, 0, 0, (0.5 - lInt) / 0.5);
    if (lInt > 0.5) {
        shadedColor = vec4(1.0, 1.0, 1.0, (lInt - 0.5) / 0.5);
    }

    vec3 litColor = ((mode & 2) == 0) ? mix(uColor, shadedColor.rgb, shadedColor.a) : mix(vColor, shadedColor.rgb, shadedColor.a);
    
    gl_FragColor = vec4(litColor, 1.0);
}