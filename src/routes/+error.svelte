<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';

  let el = $state<HTMLPreElement | null>(null);
  let animationId: number | null = null;

  const statusCode = $derived($page.status);

  onMount(() => {
    if (!el) return;

    function getSize() {
      const w = window.innerWidth;
      if (w < 500) return { cols: 55, rows: 38 };
      if (w < 769) return { cols: 70, rows: 42 };
      if (w < 1025) return { cols: 90, rows: 48 };
      return { cols: 110, rows: 52 };
    }

    let { cols, rows } = getSize();
    let grid: string[][];
    let colorGrid: string[][];
    let frame = 0;

    const C: Record<string, string> = {
      sky:      '#4a90c4',
      skyHi:    '#5ea0d4',
      sun:      '#ffcc00',
      sunGlow:  '#ffaa00',
      ray:      '#ffdd44',
      bird:     '#111122',
      cloud:    '#f0f4ff',
      hillFar:  '#80cc60',
      hillMid:  '#60aa40',
      hillNear: '#4a9030',
      tree:     '#1a5a10',
      trunk:    '#c8962a',
      leaf:     '#50b830',
      leafHi:   '#70dd40',
      river:    '#4090dd',
      riverHi:  '#60b0f0',
      foam:     '#d0eeff',
      grass:    '#90d870',
      grassHi:  '#b0f080',
      kid:      '#ffdd44',
      kidAlt:   '#ff9933',
      flower:   '#ff4060',
      flowerY:  '#ffdd00',
      error:    '#ffffff',
      errorSub: '#e0e8c0',
      path:     '#d4c088',
      butterfly:'#ff50dd',
      rock:     '#b0b098',
    };

    function init() {
      grid = [];
      colorGrid = [];
      for (let y = 0; y < rows; y++) {
        grid[y] = new Array(cols).fill(' ');
        colorGrid[y] = new Array(cols).fill(C.sky);
      }
    }

    function put(x: number, y: number, ch: string, color?: string) {
      x = Math.round(x); y = Math.round(y);
      if (x >= 0 && x < cols && y >= 0 && y < rows) {
        grid[y][x] = ch;
        colorGrid[y][x] = color || C.sky;
      }
    }

    function puts(x: number, y: number, str: string, color: string) {
      for (let i = 0; i < str.length; i++) {
        put(x + i, y, str[i], color);
      }
    }

    function horizonY() { return Math.floor(rows * 0.45); }

    function drawSky() {
      const h = horizonY();
      for (let y = 0; y < h; y++) {
        const t = y / h;
        const col = t < 0.3 ? C.skyHi : C.sky;
        for (let x = 0; x < cols; x++) {
          grid[y][x] = ' ';
          colorGrid[y][x] = col;
        }
      }
    }

    function drawSun(f: number) {
      const cx = Math.floor(cols * 0.78);
      const cy = Math.max(6, Math.floor(rows * 0.06));
      const pulse = Math.sin(f * 0.008) * 0.5 + 0.5;

      const glowR = 5.5 + pulse * 1;
      for (let a = 0; a < 32; a++) {
        const angle = (a / 32) * Math.PI * 2;
        const gx = cx + Math.cos(angle) * glowR * 2;
        const gy = cy + Math.sin(angle) * glowR * 0.6;
        const ch = a % 2 === 0 ? '\u00b7' : '.';
        put(gx, gy, ch, '#ffee88');
      }

      const numRays = 12;
      for (let r = 0; r < numRays; r++) {
        const angle = (r / numRays) * Math.PI * 2 + f * 0.0015;
        const isLong = r % 2 === 0;
        const baseLen = isLong ? 7 + pulse * 1.5 : 4.5 + pulse;
        const startD = 3.5;
        const rayChar = isLong ? '*' : '\u00b7';
        for (let d = startD; d < baseLen; d++) {
          const rx = cx + Math.cos(angle) * d * 1.8;
          const ry = cy + Math.sin(angle) * d * 0.6;
          const fade = d / baseLen;
          const col = fade > 0.7 ? '#ffee88' : '#ffdd44';
          put(rx, ry, rayChar, col);
        }
      }

      for (let a = 0; a < 20; a++) {
        const angle = (a / 20) * Math.PI * 2;
        const gx = cx + Math.cos(angle) * 4 * 1.8;
        const gy = cy + Math.sin(angle) * 4 * 0.6;
        put(gx, gy, '~', '#ffdd44');
      }

      const body = [
        '   ********   ',
        ' ************ ',
        '**************',
        '**************',
        '**************',
        ' ************ ',
        '   ********   ',
      ];
      const hw = 7;
      const hh = 3.5;
      for (let sy = 0; sy < body.length; sy++) {
        for (let sx = 0; sx < body[sy].length; sx++) {
          if (body[sy][sx] === '*') {
            const dist = Math.sqrt((sx - hw) ** 2 + (sy - hh) ** 2);
            const ch = dist < 1.5 ? '@' : dist < 3 ? '%' : '#';
            const col = dist < 1.5 ? '#ffee66' : dist < 3 ? '#ffdd22' : '#ffcc00';
            put(cx - hw + sx, cy - 3 + sy, ch, col);
          }
        }
      }
    }

    function drawClouds(f: number) {
      const clouds = [
        { x: cols * 0.12, y: Math.max(1, rows * 0.02), size: 'large' },
        { x: cols * 0.42, y: Math.max(2, rows * 0.06), size: 'large' },
        { x: cols * 0.02, y: Math.max(3, rows * 0.13), size: 'small' },
      ];

      clouds.forEach((c, i) => {
        const drift = ((f * 0.04 + i * 300) % (cols + 40)) - 20;
        const bx = Math.floor(drift);
        const by = Math.floor(c.y);
        const shadow = '#c8d8e8';
        const bright = '#ffffff';
        const mid = '#e8f0f8';

        if (c.size === 'large') {
          puts(bx+4,  by,   '._~~-~~_.',          mid);
          puts(bx+1,  by+1, ".\u00b7'        '\u00b7.",      bright);
          puts(bx,    by+2, "(    \u00b7~~\u00b7      )",    bright);
          puts(bx-1,  by+3, "\u00b7  '      '  \u00b7~~\u00b7.", mid);
          puts(bx-2,  by+4, "(                  )", shadow);
          puts(bx-1,  by+5, " '\u00b7~~\u00b7\u00b7~~~~\u00b7\u00b7~~\u00b7' ",  shadow);
        } else {
          puts(bx+2, by,   '._~~_.',       mid);
          puts(bx,   by+1, "(        )",   bright);
          puts(bx-1, by+2, "(          )", shadow);
          puts(bx,   by+3, " '\u00b7~~~~\u00b7' ",   shadow);
        }
      });
    }

    function drawBirds(f: number) {
      const numBirds = cols > 80 ? 5 : 3;
      for (let i = 0; i < numBirds; i++) {
        const speed = 0.08 + i * 0.02;
        const bx = ((f * speed + i * 40) % (cols + 20)) - 10;
        const by = Math.max(1, Math.floor(rows * 0.04 + Math.sin(f * 0.015 + i * 2) * 3 + i * 2.5));
        const wingPhase = Math.sin(f * 0.04 + i * 3);
        if (wingPhase > 0.3) {
          puts(bx, by, "v   v", C.bird);
          puts(bx, by+1, " \\_/ ", C.bird);
        } else if (wingPhase < -0.3) {
          puts(bx, by,   " ___ ", C.bird);
          puts(bx, by+1, "/ ^ \\", C.bird);
        } else {
          puts(bx, by, "-- --", C.bird);
          puts(bx, by+1, " \\_/ ", C.bird);
        }
      }
    }

    function drawHills() {
      const h = horizonY();
      const snow = '#f0f4ff';
      const snowShade = '#d0d8e8';
      const rockDark = '#7a8090';
      const rockMid = '#909aa8';
      const mtnBase = '#6a7a6a';

      const peaks = [
        { cx: cols * 0.08, height: 8,  width: 0.12 },
        { cx: cols * 0.22, height: 11, width: 0.15 },
        { cx: cols * 0.38, height: 7,  width: 0.10 },
        { cx: cols * 0.55, height: 10, width: 0.13 },
        { cx: cols * 0.70, height: 6,  width: 0.09 },
        { cx: cols * 0.85, height: 9,  width: 0.12 },
        { cx: cols * 0.97, height: 7,  width: 0.11 },
      ];

      for (const peak of peaks) {
        const px = Math.floor(peak.cx);
        const halfW = Math.floor(peak.width * cols);
        const peakTop = h - peak.height;
        const snowLine = peakTop + Math.floor(peak.height * 0.35);

        for (let x = px - halfW; x <= px + halfW; x++) {
          if (x < 0 || x >= cols) continue;
          const dx = Math.abs(x - px) / halfW;
          const slopeH = peak.height * (1 - dx * dx);
          const top = h - Math.floor(slopeH);
          if (top >= h + 2) continue;

          for (let y = top; y <= h + 2; y++) {
            if (y < 0 || y >= rows) continue;
            const isSnow = y < snowLine;
            const isNearPeak = y <= peakTop + 2;

            if (y === top) {
              if (isSnow) {
                put(x, y, x < px ? '/' : x > px ? '\\' : '^', isNearPeak ? snow : snowShade);
              } else {
                put(x, y, x < px ? '/' : x > px ? '\\' : '^', C.hillFar);
              }
            } else if (isSnow) {
              const noise = Math.sin(x * 1.7 + y * 2.3) * 0.5 + Math.sin(x * 0.8 + y * 1.1) * 0.5;
              if (y === snowLine - 1) {
                const jag = Math.sin(x * 0.5) > 0.2;
                put(x, y, jag ? '~' : '.', jag ? snowShade : rockMid);
              } else if (noise > 0.3) {
                put(x, y, '#', snow);
              } else if (noise > -0.2) {
                put(x, y, '%', snowShade);
              } else {
                put(x, y, '=', snowShade);
              }
            } else {
              const noise = Math.sin(x * 0.9 + y * 1.5);
              if (noise > 0.4) {
                put(x, y, '#', rockMid);
              } else if (noise > -0.2) {
                put(x, y, ':', rockDark);
              } else {
                put(x, y, '.', mtnBase);
              }
            }
          }
        }
      }

      for (let x = 0; x < cols; x++) {
        const hillH = Math.sin(x * 0.035 + 1.5) * 3.5 + Math.sin(x * 0.08 + 0.7) * 1.5 + 4;
        const top = h - Math.floor(hillH * 0.4);
        for (let y = top; y <= h + 3; y++) {
          if (y >= h - 2) {
            const noise = Math.sin(x * 0.6 + y * 1.2);
            if (y === top) {
              put(x, y, '~', C.hillMid);
            } else {
              put(x, y, noise > 0.3 ? ':' : noise > -0.3 ? '.' : "'", C.hillMid);
            }
          }
        }
      }

      for (let x = 0; x < cols; x++) {
        const hillH = Math.sin(x * 0.025 + 3) * 2.5 + Math.sin(x * 0.06 + 5) * 1.5 + 2;
        const top = h + 2 - Math.floor(hillH * 0.3);
        for (let y = top; y <= h + 5; y++) {
          if (y >= h + 1) {
            const noise = Math.sin(x * 0.8 + y * 0.9);
            if (y === top) {
              put(x, y, '~', C.hillFar);
            } else {
              put(x, y, noise > 0.2 ? ',' : '.', C.hillFar);
            }
          }
        }
      }
    }

    function drawTree(tx: number, ty: number, size: number, variant: number) {
      if (variant === 0) {
        if (size > 0.7) {
          puts(tx, ty-6, '  *  ', C.leafHi);
          puts(tx-1, ty-5, ' /|\\ ', C.leaf);
          puts(tx-2, ty-4, ' /|||\\ ', C.leaf);
          puts(tx-2, ty-3, '/|||||\\', C.leaf);
          puts(tx-1, ty-2, ' /|||\\ ', C.tree);
          puts(tx, ty-1, '  ||  ', C.trunk);
          puts(tx, ty,   '  ||  ', C.trunk);
        } else {
          puts(tx, ty-3, ' * ', C.leafHi);
          puts(tx, ty-2, '/|\\', C.leaf);
          puts(tx-1, ty-1, '/|||\\', C.tree);
          puts(tx, ty,   ' | ', C.trunk);
        }
      } else if (variant === 1) {
        if (size > 0.7) {
          puts(tx-1, ty-5, '  @@@@  ', C.leafHi);
          puts(tx-2, ty-4, ' @@@@@@@ ', C.leaf);
          puts(tx-2, ty-3, '@@@@@@@@@', C.leaf);
          puts(tx-2, ty-2, ' @@@@@@@ ', C.leaf);
          puts(tx-1, ty-1, '  @@@@  ', C.tree);
          puts(tx+1, ty,   '  ||', C.trunk);
        } else {
          puts(tx, ty-3, ' @@ ', C.leafHi);
          puts(tx-1, ty-2, '@@@@@', C.leaf);
          puts(tx, ty-1, ' @@@ ', C.tree);
          puts(tx+1, ty,  ' |', C.trunk);
        }
      } else {
        if (size > 0.7) {
          puts(tx-1, ty-5, '  ~~~~  ', C.leafHi);
          puts(tx-2, ty-4, ' ~~~~~~~ ', C.leaf);
          puts(tx-2, ty-3, '|||||||||', C.leaf);
          puts(tx-2, ty-2, ' ||||||| ', C.leaf);
          puts(tx-1, ty-1, '  |||||  ', C.tree);
          puts(tx+1, ty,   '  ||', C.trunk);
        } else {
          puts(tx, ty-3, '~~~~', C.leaf);
          puts(tx, ty-2, '||||', C.leaf);
          puts(tx, ty-1, ' || ', C.tree);
          puts(tx+1, ty,  ' |', C.trunk);
        }
      }
    }

    function drawTrees() {
      const h = horizonY();
      const treeDefs = [
        { x: 0.04, y: h + 4, s: 0.5, v: 0 },
        { x: 0.12, y: h + 6, s: 0.9, v: 1 },
        { x: 0.18, y: h + 3, s: 0.6, v: 0 },
        { x: 0.38, y: h + 4, s: 0.9, v: 2 },
        { x: 0.08, y: h + 9, s: 0.5, v: 0 },
        { x: 0.55, y: h + 7, s: 0.9, v: 1 },
        { x: 0.92, y: h + 4, s: 0.6, v: 2 },
      ];
      treeDefs.forEach(t => {
        drawTree(Math.floor(t.x * cols), t.y, t.s, t.v);
      });
    }

    function drawRiver(f: number) {
      const h = horizonY();

      const waypoints = [
        { x: 0.22, y: h - 8,  w: 0.5 },
        { x: 0.24, y: h - 5,  w: 0.8 },
        { x: 0.28, y: h - 2,  w: 1.2 },
        { x: 0.32, y: h + 1,  w: 1.8 },
        { x: 0.30, y: h + 3,  w: 2.5 },
        { x: 0.26, y: h + 5,  w: 3.2 },
        { x: 0.30, y: h + 7,  w: 4.0 },
        { x: 0.38, y: h + 9,  w: 5.0 },
        { x: 0.48, y: h + 11, w: 6.0 },
        { x: 0.58, y: h + 13, w: 7.0 },
        { x: 0.70, y: h + 15, w: 8.5 },
        { x: 0.82, y: h + 17, w: 10.0 },
        { x: 0.95, y: h + 19, w: 12.0 },
      ];

      for (let i = 0; i < waypoints.length - 1; i++) {
        const a = waypoints[i];
        const b = waypoints[i + 1];
        const yStart = Math.floor(a.y);
        const yEnd = Math.floor(b.y);

        for (let y = yStart; y <= yEnd; y++) {
          if (y < 0 || y >= rows) continue;
          const t = (yEnd === yStart) ? 0 : (y - yStart) / (yEnd - yStart);
          const st = t * t * (3 - 2 * t);
          const cx = (a.x + (b.x - a.x) * st) * cols;
          const width = a.w + (b.w - a.w) * st;
          const wobble = Math.sin(y * 0.4 + f * 0.015) * (width * 0.15);
          const finalCx = cx + wobble;

          for (let x = Math.floor(finalCx - width); x <= Math.floor(finalCx + width); x++) {
            if (x < 0 || x >= cols) continue;
            const edge = Math.abs(x - finalCx) / width;
            const flow = Math.sin(x * 0.25 + y * 0.3 - f * 0.025);
            const ripple = Math.sin(x * 0.5 - f * 0.015 + y * 0.8);
            const isMountain = width < 2;
            const isNarrow = width < 4;

            if (edge > 0.88) {
              put(x, y, '~', C.foam);
            } else if (isMountain) {
              const rapid = Math.sin(x * 0.8 + y * 1.2 - f * 0.03);
              put(x, y, rapid > 0 ? '~' : ':', '#88ccee');
            } else if (edge > 0.7) {
              put(x, y, ripple > 0 ? '~' : '-', C.riverHi);
            } else if (isNarrow) {
              if (flow > 0.3) put(x, y, '~', C.riverHi);
              else if (flow > -0.3) put(x, y, '\u2248', C.river);
              else put(x, y, '~', C.river);
            } else {
              if (flow > 0.5) put(x, y, '~', C.riverHi);
              else if (flow > 0.1) put(x, y, '\u2248', C.river);
              else if (flow > -0.3) put(x, y, '~', C.river);
              else put(x, y, '-', C.river);
            }
          }
        }
      }
    }

    function drawGround() {
      const h = horizonY();
      const groundStart = h + 2;

      for (let y = groundStart; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          if (grid[y][x] === ' ') {
            const noise = Math.sin(x * 0.7 + y * 1.3) * 0.5 + Math.sin(x * 1.1 + y * 0.4) * 0.5;
            if (noise > 0.6) {
              put(x, y, ',', C.grassHi);
            } else if (noise > 0.2) {
              put(x, y, '.', C.grass);
            } else if (noise > -0.2) {
              put(x, y, "'", C.grass);
            } else {
              put(x, y, '.', C.hillNear);
            }
          }
        }
      }
    }

    function drawFlowers(f: number) {
      const h = horizonY();
      const flowers = [
        { x: 0.1, y: h + 8 }, { x: 0.2, y: h + 10 }, { x: 0.35, y: h + 9 },
        { x: 0.7, y: h + 8 }, { x: 0.8, y: h + 11 }, { x: 0.55, y: h + 12 },
        { x: 0.42, y: h + 11 }, { x: 0.92, y: h + 9 },
      ];
      flowers.forEach((fl, i) => {
        const fx = Math.floor(fl.x * cols);
        const fy = fl.y;
        if (fy < rows - 3) {
          const sway = Math.sin(f * 0.01 + i * 2) > 0;
          const col = i % 3 === 0 ? C.flower : i % 3 === 1 ? C.flowerY : C.butterfly;
          if (sway) {
            put(fx, fy - 1, '*', col);
            put(fx, fy, '|', C.grass);
          } else {
            put(fx, fy - 1, '@', col);
            put(fx, fy, '|', C.grass);
          }
        }
      });
    }

    function drawKids(f: number) {
      const h = horizonY();
      const groundY = h + 9;

      const k1x = Math.floor(((f * 0.1) % (cols * 0.4)) + cols * 0.05);
      const k1y = Math.min(groundY, rows - 4);
      const k1Phase = Math.floor(f / 20) % 4;

      if (k1Phase === 0 || k1Phase === 2) {
        puts(k1x, k1y - 2, ' o ', C.kid);
        puts(k1x, k1y - 1, '/|\\', C.kid);
        puts(k1x, k1y,     '/ \\', C.kid);
      } else if (k1Phase === 1) {
        puts(k1x, k1y - 2, ' o ', C.kid);
        puts(k1x, k1y - 1, '-|>', C.kid);
        puts(k1x, k1y,     ' |\\', C.kid);
      } else {
        puts(k1x, k1y - 2, ' o ', C.kid);
        puts(k1x, k1y - 1, '<|-', C.kid);
        puts(k1x, k1y,     '/| ', C.kid);
      }

      const k2x = Math.floor(cols * 0.9 - ((f * 0.09) % (cols * 0.35)));
      const k2y = Math.min(groundY + 1, rows - 4);
      const k2Phase = Math.floor(f / 18) % 4;

      if (k2Phase === 0 || k2Phase === 2) {
        puts(k2x, k2y - 2, ' o ', C.kidAlt);
        puts(k2x, k2y - 1, '/|\\', C.kidAlt);
        puts(k2x, k2y,     '/ \\', C.kidAlt);
      } else if (k2Phase === 1) {
        puts(k2x, k2y - 2, ' o ', C.kidAlt);
        puts(k2x, k2y - 1, '<|-', C.kidAlt);
        puts(k2x, k2y,     '/| ', C.kidAlt);
      } else {
        puts(k2x, k2y - 2, ' o ', C.kidAlt);
        puts(k2x, k2y - 1, '-|>', C.kidAlt);
        puts(k2x, k2y,     ' |\\', C.kidAlt);
      }

      const k3x = Math.floor(cols * 0.5);
      const k3y = Math.min(groundY - 1, rows - 5);
      const jump = Math.abs(Math.sin(f * 0.025)) * 2;
      const jy = Math.floor(k3y - jump);
      const k3Phase = Math.floor(f / 25) % 2;

      if (k3Phase === 0) {
        puts(k3x, jy - 1, '\\o/', C.kid);
        puts(k3x, jy,     ' | ', C.kid);
        puts(k3x, jy + 1, '/ \\', C.kid);
      } else {
        puts(k3x, jy - 1, ' o ', C.kid);
        puts(k3x, jy,     '/|\\', C.kid);
        puts(k3x, jy + 1, ' | ', C.kid);
      }
    }

    function drawButterflies(f: number) {
      const h = horizonY();
      const bfs = [
        { cx: cols * 0.3, cy: h + 5, r: 4, speed: 0.008 },
        { cx: cols * 0.68, cy: h + 4, r: 3, speed: 0.01 },
      ];
      bfs.forEach((b, i) => {
        const angle = f * b.speed + i * Math.PI;
        const bx = Math.floor(b.cx + Math.cos(angle) * b.r * 2);
        const by = Math.floor(b.cy + Math.sin(angle) * b.r * 0.5);
        const wing = Math.sin(f * 0.05 + i) > 0;
        if (wing) {
          puts(bx, by, '}{', C.butterfly);
        } else {
          puts(bx, by, '<>', C.butterfly);
        }
      });
    }

    function drawBear(f: number) {
      const bearCol = '#553322';
      const bearHi = '#775533';

      const range = cols * 0.35;
      const cx = cols * 0.5;
      const sway = Math.sin(f * 0.004) * range;
      const bx = Math.floor(cx + sway);
      const by = rows - 5;
      const goingRight = Math.cos(f * 0.004) > 0;
      const step = Math.floor(f / 25) % 4;

      if (goingRight) {
        puts(bx, by - 2, ' /"\\_.', bearHi);
        puts(bx, by - 1, '(o  _>', bearCol);
        if (step === 0 || step === 2) {
          puts(bx, by,     '|~~~~|', bearCol);
          puts(bx, by + 1, '|| ||', bearCol);
        } else if (step === 1) {
          puts(bx, by,     '|~~~~|', bearCol);
          puts(bx, by + 1, '/|  |\\', bearCol);
        } else {
          puts(bx, by,     '|~~~~|', bearCol);
          puts(bx, by + 1, '\\| |/', bearCol);
        }
      } else {
        puts(bx, by - 2, '._/"\\', bearHi);
        puts(bx, by - 1, '<_  o)', bearCol);
        if (step === 0 || step === 2) {
          puts(bx, by,     '|~~~~|', bearCol);
          puts(bx, by + 1, ' || ||', bearCol);
        } else if (step === 1) {
          puts(bx, by,     '|~~~~|', bearCol);
          puts(bx, by + 1, '/|  |\\', bearCol);
        } else {
          puts(bx, by,     '|~~~~|', bearCol);
          puts(bx, by + 1, '\\| |/', bearCol);
        }
      }
    }

    function drawDeer(f: number) {
      const deerCol = '#bb8844';
      const antler = '#997744';
      const fawnCol = '#cc9966';

      const d1x = Math.floor(cols * 0.04 + Math.sin(f * 0.002) * cols * 0.04);
      const d1y = rows - 6;
      const headUp = Math.sin(f * 0.008) > 0.5;

      if (headUp) {
        puts(d1x, d1y - 3, ' |/ |/', antler);
        puts(d1x, d1y - 2, '  (O)', deerCol);
        puts(d1x, d1y - 1, '  |~~\\', deerCol);
        puts(d1x, d1y,     '  |   |', deerCol);
        puts(d1x, d1y + 1, '  |l |l', deerCol);
      } else {
        puts(d1x, d1y - 2, ' |/ |/', antler);
        puts(d1x, d1y - 1, ' |~~(O)', deerCol);
        puts(d1x, d1y,     ' |   | ,', deerCol);
        puts(d1x, d1y + 1, ' |l |l', deerCol);
      }

      const d2x = Math.floor(cols * 0.14 + Math.sin(f * 0.003 + 1) * cols * 0.03);
      const d2y = rows - 5;
      const d2head = Math.sin(f * 0.01 + 2) > 0.2;

      if (d2head) {
        puts(d2x, d2y - 2, ' \\/ \\/', antler);
        puts(d2x, d2y - 1, '  (o) ', deerCol);
        puts(d2x, d2y,     '  |~~|', deerCol);
        puts(d2x, d2y + 1, '  || ||', deerCol);
      } else {
        puts(d2x, d2y - 1, '  |~~(o)', deerCol);
        puts(d2x, d2y,     '  |   |', deerCol);
        puts(d2x, d2y + 1, '  || ||', deerCol);
      }

      const d3x = d1x + 9;
      const d3y = rows - 4;
      const fawnBounce = Math.sin(f * 0.015) > 0.6 ? -1 : 0;

      puts(d3x, d3y - 1 + fawnBounce, '(o)', fawnCol);
      puts(d3x, d3y + fawnBounce,     '|~|', fawnCol);
      puts(d3x, d3y + 1 + fawnBounce, '|| ', fawnCol);
    }

    function drawRocks() {
      const h = horizonY();
      const rocks = [
        { x: 0.18, y: h + 7 },
        { x: 0.75, y: h + 10 },
        { x: 0.45, y: h + 12 },
      ];
      rocks.forEach(r => {
        const rx = Math.floor(r.x * cols);
        const ry = r.y;
        if (ry < rows - 2) {
          puts(rx, ry, '(##)', C.rock);
        }
      });
    }

    function drawErrorMessage(f: number) {
      const h = horizonY();
      const msgY = h + Math.floor((rows - h) * 0.65);

      const code = String(statusCode);
      const line1 = `~ ${code.split('').join(' ')} ~`;
      const line2 = statusCode === 404
        ? 'this page wandered off the trail'
        : 'something went wrong';
      const line3 = '. . . enjoy the view . . .';

      const x1 = Math.floor((cols - line1.length) / 2);
      const x2 = Math.floor((cols - line2.length) / 2);
      const x3 = Math.floor((cols - line3.length) / 2);

      const y = Math.min(msgY, rows - 5);
      puts(x1, y, line1, C.error);
      puts(x2, y + 2, line2, C.errorSub);
      puts(x3, y + 3, line3, C.errorSub);
    }

    function drawPath() {
      const h = horizonY();
      const pathStart = h + 5;
      for (let y = pathStart; y < Math.min(pathStart + 6, rows - 4); y++) {
        const t = (y - pathStart) / 6;
        const cx = cols * 0.5 + Math.sin(t * 2) * 3;
        const w = 1 + t * 2;
        for (let x = Math.floor(cx - w); x <= Math.floor(cx + w); x++) {
          if (x >= 0 && x < cols) {
            put(x, y, '\u00b7', C.path);
          }
        }
      }
    }

    function escapeHtml(s: string) {
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function render() {
      if (!el) return;
      init();
      drawSky();
      drawSun(frame);
      drawClouds(frame);
      drawHills();
      drawGround();
      drawRiver(frame);
      drawRocks();
      drawFlowers(frame);
      drawTrees();
      drawButterflies(frame);
      drawKids(frame);
      drawDeer(frame);
      drawBear(frame);
      drawBirds(frame);
      drawErrorMessage(frame);

      let html = '';
      for (let y = 0; y < rows; y++) {
        let currentColor = '';
        let run = '';
        for (let x = 0; x < cols; x++) {
          const col = colorGrid[y][x];
          const ch = grid[y][x];
          if (col !== currentColor) {
            if (run) {
              html += `<span style="color:${currentColor}">${escapeHtml(run)}</span>`;
              run = '';
            }
            currentColor = col;
          }
          run += ch;
        }
        if (run) {
          html += `<span style="color:${currentColor}">${escapeHtml(run)}</span>`;
        }
        html += '\n';
      }

      el.innerHTML = html;
      frame++;
      animationId = requestAnimationFrame(render);
    }

    const handleResize = () => {
      const size = getSize();
      cols = size.cols;
      rows = size.rows;
    };

    window.addEventListener('resize', handleResize);
    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationId !== null) cancelAnimationFrame(animationId);
    };
  });
</script>

<svelte:head>
  <title>{statusCode} — Ethan Hathaway</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet" />
</svelte:head>

<div class="error-page">
  <pre bind:this={el} class="scene"></pre>
  <a href="/" class="home-link" onclick={(e) => { e.preventDefault(); goto('/').then(() => window.scrollTo(0, 0)); }}>
    <svg class="home-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
    </svg>
    Back home
  </a>
</div>

<style>
  .error-page {
    position: fixed;
    inset: 0;
    background: linear-gradient(to bottom, #5ea0d4 0%, #5ea0d4 43%, #3a7a2a 43%, #2d6a1d 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    z-index: 9999;
  }

  .scene {
    white-space: pre;
    line-height: 1.15;
    letter-spacing: 0.05em;
    font-size: 14px;
    color: #2a5a2a;
    text-align: center;
    user-select: none;
    -webkit-user-select: none;
    font-family: 'JetBrains Mono', 'Courier New', monospace;
    margin: 0;
  }

  .home-link {
    position: fixed;
    bottom: 1.5rem;
    left: 50%;
    transform: translateX(-50%);
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(8px);
    border-radius: 9999px;
    color: #f0f4ff;
    font-family: 'JetBrains Mono', 'Courier New', monospace;
    font-size: 0.75rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    text-decoration: none;
    transition: background 0.2s, color 0.2s;
  }

  .home-link:hover {
    background: rgba(255, 255, 255, 0.3);
    color: #ffffff;
  }

  .home-icon {
    width: 1rem;
    height: 1rem;
  }

  @media (max-width: 768px) {
    .scene {
      font-size: 8px;
      line-height: 1.1;
      letter-spacing: 0;
    }
  }

  @media (min-width: 769px) and (max-width: 1024px) {
    .scene {
      font-size: 11px;
      line-height: 1.12;
      letter-spacing: 0.03em;
    }
  }

  @media (min-width: 1025px) {
    .scene {
      font-size: 14px;
    }
  }
</style>
