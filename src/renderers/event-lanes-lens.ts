import { Scene } from '../core/types';
import { evaluatePlacedShape, resolveDuMetricOffsetToken } from '../core/shape';
import { resolveDuPeriodAddress, dToFreq } from '../core/axis';
import { SOLFEGE_COLORS, SOLFEGE_NEON_COLORS } from '../core/ppt-constants';
import { RegisteredLensRenderer } from './render-coordinator';
import { PostProcessingLight } from './webgl-post-processing';

export class EventLanesLensRenderer implements RegisteredLensRenderer {
  public id = 'event-lanes';
  private dynamicLights: PostProcessingLight[] = [];

  public getDynamicLights(): PostProcessingLight[] {
    return this.dynamicLights;
  }

  public render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    scene: Scene,
    transportTime: number,
    audioPhase: number = 0,
    isAudioActive: boolean = false
  ): void {
    this.dynamicLights = [];

    const placement = scene.placements[0];
    if (!placement) return;
    const shape = scene.shapes.find((s) => s.id === placement.shapeId);
    if (!shape) return;

    const partials = evaluatePlacedShape(shape, placement, scene.filter);
    const activePartials = partials.filter((p) => p.filteredAmp > 0.001);
    if (activePartials.length === 0) return;

    const f0 = dToFreq(placement.d, scene.anchors.tplFrequencyHz);

    // Phase progress: in rhythmic regime, lock to worklet audioPhase; otherwise extrapolate
    const phaseProgress = isAudioActive
      ? (f0 <= 25.8 ? (audioPhase % 1.0) : ((transportTime * 1.0) % 1.0))
      : 0;

    // Header label
    ctx.save();
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 9px JetBrains Mono, monospace';
    ctx.fillText('EVENT LANES & COMPOSITE RIPPLE', 20, 24);

    const topMargin = 38;
    const bottomMargin = 40;
    const availableHeight = height - topMargin - bottomMargin;
    const numLanes = activePartials.length;
    const laneHeight = Math.max(16, availableHeight / Math.max(1, numLanes));

    const leftX = 100;
    const rightX = width - 25;
    const laneWidth = rightX - leftX;

    // Playhead marker vertical line
    const playheadX = leftX + phaseProgress * laneWidth;
    ctx.strokeStyle = 'rgba(238, 54, 16, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(playheadX, topMargin);
    ctx.lineTo(playheadX, height - 20);
    ctx.stroke();
    ctx.setLineDash([]);

    let compositeHits = 0;

    // Render individual partial lanes
    for (let i = 0; i < numLanes; i++) {
      const p = activePartials[i];
      const y = topMargin + i * laneHeight;
      const addr = resolveDuPeriodAddress(p.d);
      const col = SOLFEGE_COLORS[addr.semitoneIndex] || '#38bdf8';
      const neonCol = SOLFEGE_NEON_COLORS[addr.semitoneIndex] || col;

      // Lane track line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(leftX, y + laneHeight / 2);
      ctx.lineTo(rightX, y + laneHeight / 2);
      ctx.stroke();

      // Lane descriptor
      ctx.fillStyle = neonCol;
      ctx.font = 'bold 10px JetBrains Mono, monospace';
      ctx.textAlign = 'right';
      const phaseTag = p.phase > 0.001 ? ` @${resolveDuMetricOffsetToken(p.phase).token}` : '';
      ctx.fillText(`${addr.formatted}${phaseTag} (${p.ratioValue.toFixed(2)}x)`, leftX - 10, y + laneHeight / 2 + 3);

      // Event tick marks across the lane
      const eventsPerCycle = Math.max(1, Math.round(p.ratioValue));
      for (let e = 0; e < eventsPerCycle; e++) {
        const eventFrac = (e / eventsPerCycle + p.phase) % 1.0;
        const tickX = leftX + eventFrac * laneWidth;
        const tickDist = Math.abs(eventFrac - phaseProgress);
        const isHit = tickDist < 0.02 || tickDist > 0.98;

        if (isHit) compositeHits++;

        const tickH = (laneHeight * 0.45) * (isHit ? 1.4 : 1.0);
        ctx.fillStyle = isHit ? '#ffffff' : col;
        ctx.beginPath();
        ctx.roundRect(tickX - (isHit ? 2 : 1), y + (laneHeight - tickH) / 2, isHit ? 4 : 2, tickH, 2);
        ctx.fill();

        if (isHit) {
          this.dynamicLights.push({
            x: tickX,
            y: y + laneHeight / 2,
            velocity: 1.0,
            colorHex: neonCol,
          });
        }
      }
    }

    // Bottom Composite Collision / Ripple Track
    const compositeY = height - 25;
    ctx.strokeStyle = 'rgba(225, 54, 16, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(leftX, compositeY);
    ctx.lineTo(rightX, compositeY);
    ctx.stroke();

    ctx.fillStyle = '#E13610';
    ctx.font = 'bold 9px JetBrains Mono, monospace';
    ctx.textAlign = 'right';
    ctx.fillText('COMPOSITE', leftX - 10, compositeY + 3);

    // Draw active shockwave or spark indicator on composite lane when strikes occur
    if (compositeHits > 0) {
      const dotRadius = Math.min(10, 4 + compositeHits * 2);
      ctx.fillStyle = compositeHits > 1 ? '#ffffff' : '#E13610';
      ctx.beginPath();
      ctx.arc(playheadX, compositeY, dotRadius, 0, Math.PI * 2);
      ctx.fill();

      this.dynamicLights.push({
        x: playheadX,
        y: compositeY,
        velocity: Math.min(1.0, 0.5 + compositeHits * 0.25),
        colorHex: compositeHits > 1 ? '#ffffff' : '#FF4D4D',
      });
    }

    ctx.restore();
  }
}
