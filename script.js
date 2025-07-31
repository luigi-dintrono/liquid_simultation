const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let width, height, resolution = 64;
let size = (resolution + 2) * (resolution + 2);

// simulation parameters
let dt = 0.1;
let diffusion = 0.0;
let viscosity = 0.0;
let curl = 30.0;

let dens = new Float32Array(size);
let densPrev = new Float32Array(size);
let u = new Float32Array(size);
let v = new Float32Array(size);
let uPrev = new Float32Array(size);
let vPrev = new Float32Array(size);

function IX(x, y) { return x + (resolution + 2) * y; }

function reset() {
  width = canvas.clientWidth;
  height = canvas.clientHeight;
  canvas.width = width;
  canvas.height = height;
}
window.addEventListener('resize', reset);
reset();

function addSource(x, s) {
  for (let i = 0; i < size; i++) x[i] += dt * s[i];
}

function setBnd(b, x) {
  for (let i = 1; i <= resolution; i++) {
    x[IX(0, i)] = b === 1 ? -x[IX(1, i)] : x[IX(1, i)];
    x[IX(resolution + 1, i)] = b === 1 ? -x[IX(resolution, i)] : x[IX(resolution, i)];
    x[IX(i, 0)] = b === 2 ? -x[IX(i, 1)] : x[IX(i, 1)];
    x[IX(i, resolution + 1)] = b === 2 ? -x[IX(i, resolution)] : x[IX(i, resolution)];
  }
  x[IX(0, 0)] = 0.5 * (x[IX(1, 0)] + x[IX(0, 1)]);
  x[IX(0, resolution + 1)] = 0.5 * (x[IX(1, resolution + 1)] + x[IX(0, resolution)]);
  x[IX(resolution + 1, 0)] = 0.5 * (x[IX(resolution, 0)] + x[IX(resolution + 1, 1)]);
  x[IX(resolution + 1, resolution + 1)] = 0.5 * (x[IX(resolution, resolution + 1)] + x[IX(resolution + 1, resolution)]);
}

function linSolve(b, x, x0, a, c) {
  for (let k = 0; k < 20; k++) {
    for (let i = 1; i <= resolution; i++) {
      for (let j = 1; j <= resolution; j++) {
        x[IX(i, j)] = (x0[IX(i, j)] + a*(x[IX(i-1, j)] + x[IX(i+1, j)] + x[IX(i, j-1)] + x[IX(i, j+1)])) / c;
      }
    }
    setBnd(b, x);
  }
}

function diffuse(b, x, x0, diff) {
  const a = dt * diff * resolution * resolution;
  linSolve(b, x, x0, a, 1 + 4 * a);
}

function advect(b, d, d0, u, v) {
  let dt0 = dt * resolution;
  for (let i = 1; i <= resolution; i++) {
    for (let j = 1; j <= resolution; j++) {
      let x = i - dt0 * u[IX(i, j)];
      let y = j - dt0 * v[IX(i, j)];
      if (x < 0.5) x = 0.5; if (x > resolution + 0.5) x = resolution + 0.5;
      let i0 = Math.floor(x); let i1 = i0 + 1;
      if (y < 0.5) y = 0.5; if (y > resolution + 0.5) y = resolution + 0.5;
      let j0 = Math.floor(y); let j1 = j0 + 1;
      let s1 = x - i0; let s0 = 1 - s1; let t1 = y - j0; let t0 = 1 - t1;
      d[IX(i, j)] = s0 * (t0 * d0[IX(i0, j0)] + t1 * d0[IX(i0, j1)]) + s1 * (t0 * d0[IX(i1, j0)] + t1 * d0[IX(i1, j1)]);
    }
  }
  setBnd(b, d);
}

function project(u, v, p, div) {
  for (let i = 1; i <= resolution; i++) {
    for (let j = 1; j <= resolution; j++) {
      div[IX(i, j)] = -0.5*(u[IX(i+1, j)] - u[IX(i-1, j)] + v[IX(i, j+1)] - v[IX(i, j-1)]) / resolution;
      p[IX(i, j)] = 0;
    }
  }
  setBnd(0, div); setBnd(0, p);
  linSolve(0, p, div, 1, 4);
  for (let i = 1; i <= resolution; i++) {
    for (let j = 1; j <= resolution; j++) {
      u[IX(i, j)] -= 0.5 * resolution * (p[IX(i+1, j)] - p[IX(i-1, j)]);
      v[IX(i, j)] -= 0.5 * resolution * (p[IX(i, j+1)] - p[IX(i, j-1)]);
    }
  }
  setBnd(1, u); setBnd(2, v);
}

function velStep(u, v, u0, v0) {
  addSource(u, u0); addSource(v, v0);
  [u0, u] = [u, u0]; diffuse(1, u, u0, viscosity); [v0, v] = [v, v0]; diffuse(2, v, v0, viscosity);
  project(u, v, u0, v0);
  [u0, u] = [u, u0]; [v0, v] = [v, v0];
  advect(1, u, u0, u0, v0); advect(2, v, v0, u0, v0);
  project(u, v, u0, v0);
}

function densStep(x, x0, u, v) {
  addSource(x, x0);
  [x0, x] = [x, x0]; diffuse(0, x, x0, diffusion);
  [x0, x] = [x, x0]; advect(0, x, x0, u, v);
}

function renderDens(d) {
  let img = ctx.getImageData(0, 0, width, height);
  for (let i = 1; i <= resolution; i++) {
    for (let j = 1; j <= resolution; j++) {
      let densVal = d[IX(i, j)];
      let color = Math.min(255, densVal * 255);
      for (let x = 0; x < width / resolution; x++) {
        for (let y = 0; y < height / resolution; y++) {
          let px = Math.floor((i - 1) * width / resolution + x);
          let py = Math.floor((j - 1) * height / resolution + y);
          let idx = (py * width + px) * 4;
          img.data[idx] = color;
          img.data[idx + 1] = 100;
          img.data[idx + 2] = 255 - color;
          img.data[idx + 3] = 255;
        }
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}

function step() {
  velStep(u, v, uPrev, vPrev);
  densStep(dens, densPrev, u, v);
  renderDens(dens);
  // reset prev arrays
  uPrev.fill(0); vPrev.fill(0); densPrev.fill(0);
  requestAnimationFrame(step);
}

let mouseDown = false;
canvas.addEventListener('mousedown', () => mouseDown = true);
window.addEventListener('mouseup', () => mouseDown = false);
canvas.addEventListener('mousemove', (e) => {
  if (!mouseDown) return;
  const rect = canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * resolution + 1;
  const y = ((e.clientY - rect.top) / rect.height) * resolution + 1;
  const i = Math.floor(x); const j = Math.floor(y);
  if (i > 0 && i <= resolution && j > 0 && j <= resolution) {
    densPrev[IX(i, j)] = 10;
    uPrev[IX(i, j)] = (x - i) * curl;
    vPrev[IX(i, j)] = (y - j) * curl;
  }
});

// sliders
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

step();
