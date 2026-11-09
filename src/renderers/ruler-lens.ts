import { Scene } from '../core/types';
import { evaluatePlacedShape } from '../core/shape';
import { calculateGhostFundamental } from '../core/alignment';
import { SOLFEGE_COLORS, SOLFEGE_NEON_COLORS } from '../core/ppt-constants';
import { resolveDuPeriodAddress, dToFreq, dToBpm, freqToPitchRegister } from '../core/axis';
import { LensLabelMode } from '../core/layout-models';
import { RegisteredLensRenderer } from './render-coordinator';
import { PostProcessingLight } from './webgl-post-processing';

export class RulerLensRenderer implements RegisteredLensRenderer {
  public id = 'ruler';
  private dynamicLights: PostProcessingLight[] = [];

  public getDynamicLights(): PostProcessingLight[] {
    return this.dynamicLights;
  }

  public render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    scene: Scene,
    _transportTime: number = 0,
    _audioPhase: number = 0,
    _isAudioActive: boolean = false,
    labelMode: LensLabelMode = 'duperiod'
  ): void {
    this.dynamicLights = [];

    // Axis d range mapping: center d=0 at center x=width/2, span ±8 DuPeriods
    const dMin = -8;
    const dMax = 8;
    const dSpan = dMax - dMin;

    const dToX = (d: number): number => {
      // Faster / negative d to the right (x = -d)
      return width / 2 - (d / (dSpan / 2)) * (width * 0.45);
    };

    const baselineY = height * 0.72;

    // 1. Shaded TPL Transition Zone (10 Hz to 40 Hz => d ≈ +1.37 to -0.63)
    const x10Hz = dToX(1.367);
    const x40Hz = dToX(-0.632);
    const xTPL = dToX(0.0);

    const leftX = Math.min(x10Hz, x40Hz);
    const zoneW = Math.abs(x40Hz - x10Hz);

    ctx.save();
    ctx.fillStyle = 'rgba(238, 54, 16, 0.08)';
    ctx.fillRect(leftX, 0, zoneW, height);

    // TPL boundary line
    ctx.strokeStyle = '#E13610';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(xTPL, 20);
    ctx.lineTo(xTPL, height - 20);
    ctx.stroke();
    ctx.setLineDash([]);

    // TPL Label
    ctx.fillStyle = '#E13610';
    ctx.font = 'bold 10px JetBrains Mono, monospace';
    ctx.fillText('TPL (25.8 Hz / 38.7 ms)', xTPL + 6, 32);
    ctx.restore();

    // 2. Main baseline ruler
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, baselineY);
    ctx.lineTo(width - 20, baselineY);
    ctx.stroke();

    // Octave / DuPeriod band ticks
    for (let bandD = -7; bandD <= 7; bandD++) {
      const tx = dToX(bandD);
      if (tx < 20 || tx > width - 20) continue;

      ctx.beginPath();
      ctx.moveTo(tx, baselineY - 8);
      ctx.lineTo(tx, baselineY + 8);
      ctx.strokeStyle = bandD === 0 ? '#E13610' : 'rgba(255, 255, 255, 0.3)';
      ctx.stroke();

      const addr = resolveDuPeriodAddress(bandD);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(addr.formatted, tx, baselineY + 22);
    }
    ctx.restore();

    // 3. Render placed shapes & partials
    for (const placement of scene.placements) {
      const shape = scene.shapes.find((s) => s.id === placement.shapeId);
      if (!shape) continue;

      const partials = evaluatePlacedShape(shape, placement, scene.filter);
      const f0 = dToFreq(placement.d, scene.anchors.tplFrequencyHz);
      const ghost = calculateGhostFundamental(shape, f0);

      // Render Ghost Fundamental / Common Sam Anchor
      const gx = dToX(ghost.ghostD);
      if (gx >= 0 && gx <= width) {
        const ghostH = height * 0.52;
        const gy = baselineY - ghostH;

        ctx.save();
        ctx.strokeStyle = '#E13610';
        ctx.lineWidth = 1.8;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(gx, baselineY);
        ctx.lineTo(gx, gy);
        ctx.stroke();
        ctx.setLineDash([]);

        // Diamond marker at the top of Ghost Fundamental
        ctx.fillStyle = '#E13610';
        ctx.beginPath();
        ctx.moveTo(gx, gy - 6);
        ctx.lineTo(gx + 5, gy);
        ctx.lineTo(gx, gy + 6);
        ctx.lineTo(gx - 5, gy);
        ctx.closePath();
        ctx.fill();

        ctx.font = 'bold 8px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('GHOST (SAM)', gx, gy - 12);
        ctx.fillStyle = 'rgba(238, 54, 16, 0.7)';
        ctx.font = '7px JetBrains Mono, monospace';
        ctx.fillText(
          ghost.ghostFreqHz < 25
            ? `${(ghost.cycleDurationSec * 1000).toFixed(0)} ms`
            : `${ghost.ghostFreqHz.toFixed(1)} Hz`,
          gx,
          gy - 3
        );
        ctx.restore();

        this.dynamicLights.push({
          x: gx,
          y: gy,
          velocity: 0.85,
          colorHex: '#FF4D4D',
        });
      }

      for (const p of partials) {
        if (p.filteredAmp <= 0.001) continue;

        const px = dToX(p.d);
        if (px < 0 || px > width) continue;

        const addr = resolveDuPeriodAddress(p.d);
        const col = SOLFEGE_COLORS[addr.semitoneIndex] || '#ffffff';
        const neonCol = SOLFEGE_NEON_COLORS[addr.semitoneIndex] || col;

        const maxH = height * 0.45;
        const barH = p.filteredAmp * maxH;
        const py = baselineY - barH;

        ctx.save();
        // Partial line
        ctx.strokeStyle = col;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(px, baselineY);
        ctx.lineTo(px, py);
        ctx.stroke();

        // Tip circle
        ctx.fillStyle = neonCol;
        ctx.beginPath();
        ctx.arc(px, py, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // Label formatted according to active labelMode
        let displayLabel = p.label || addr.syllable;
        if (labelMode === 'pitch') {
          displayLabel = freqToPitchRegister(p.freqHz, scene.anchors.tuningA4Hz).formatted;
        } else if (labelMode === 'bpm') {
          displayLabel = `${dToBpm(p.d, scene.anchors.tplFrequencyHz).toFixed(0)} BPM`;
        } else if (labelMode === 'solfege') {
          displayLabel = addr.formatted;
        } else if (labelMode === 'duperiod') {
          displayLabel = `d: ${p.d.toFixed(2)}`;
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = '9px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(displayLabel, px, py - 8);
        ctx.restore();

        // Add to dynamic lights for WebGL halation & lens flare
        this.dynamicLights.push({
          x: px,
          y: py,
          velocity: p.filteredAmp,
          colorHex: neonCol,
        });
      }
    }
  }
}
