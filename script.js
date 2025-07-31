const container = document.getElementById('scene');
let width = container.clientWidth;
let height = container.clientHeight;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(width, height);
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
camera.position.z = 5;

const boxSize = 2;
const halfBox = boxSize / 2;

// wireframe box
const boxGeometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
const edges = new THREE.EdgesGeometry(boxGeometry);
const box = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff }));
scene.add(box);

const numParticles = 1000;
const positions = new Float32Array(numParticles * 3);
const velocities = [];
for (let i = 0; i < numParticles; i++) {
  positions[i * 3] = (Math.random() - 0.5) * boxSize;
  positions[i * 3 + 1] = (Math.random() - 0.5) * boxSize;
  positions[i * 3 + 2] = (Math.random() - 0.5) * boxSize;
  velocities.push(new THREE.Vector3());
}
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
const material = new THREE.PointsMaterial({ color: 0x44aaff, size: 0.05 });
const particles = new THREE.Points(geometry, material);
scene.add(particles);

let dt = 0.8;
let diffusion = 0.02;
let viscosity = 0.01;
let curl = 30.0;

function onResize() {
  width = container.clientWidth;
  height = container.clientHeight;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', onResize);

function updateParticles() {
  for (let i = 0; i < numParticles; i++) {
    const idx = i * 3;
    const v = velocities[i];

    v.x += (Math.random() - 0.5) * diffusion;
    v.y += (Math.random() - 0.5) * diffusion;
    v.z += (Math.random() - 0.5) * diffusion;

    const swirl = new THREE.Vector3(-positions[idx + 1], positions[idx], 0);
    swirl.multiplyScalar(curl * 0.0001);
    v.add(swirl);

    v.multiplyScalar(1 - viscosity);

    positions[idx] += v.x * dt;
    positions[idx + 1] += v.y * dt;
    positions[idx + 2] += v.z * dt;

    if (positions[idx] < -halfBox || positions[idx] > halfBox) {
      v.x *= -1;
      positions[idx] = THREE.MathUtils.clamp(positions[idx], -halfBox, halfBox);
    }
    if (positions[idx + 1] < -halfBox || positions[idx + 1] > halfBox) {
      v.y *= -1;
      positions[idx + 1] = THREE.MathUtils.clamp(positions[idx + 1], -halfBox, halfBox);
    }
    if (positions[idx + 2] < -halfBox || positions[idx + 2] > halfBox) {
      v.z *= -1;
      positions[idx + 2] = THREE.MathUtils.clamp(positions[idx + 2], -halfBox, halfBox);
    }
  }
  geometry.attributes.position.needsUpdate = true;
}

function animate() {
  requestAnimationFrame(animate);
  updateParticles();
  renderer.render(scene, camera);
}

// slider bindings
onResize();

animate();

document.getElementById('density').addEventListener('input', (e) => {
  diffusion = 1 - parseFloat(e.target.value);
});
document.getElementById('velocity').addEventListener('input', (e) => {
  viscosity = 1 - parseFloat(e.target.value);
});
document.getElementById('pressure').addEventListener('input', (e) => {
  dt = parseFloat(e.target.value);
});
document.getElementById('curl').addEventListener('input', (e) => {
  curl = parseFloat(e.target.value);
});
