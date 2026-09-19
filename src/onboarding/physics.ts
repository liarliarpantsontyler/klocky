/** Time-based motion in CSS pixels/second, independent of display refresh rate. */
export class CarouselMotion {
  position = 0;
  velocity = 0;
  target: number | null = null;
  dragging = false;
  lastInput = -Infinity;
  interact(now: number) {
    this.lastInput = now;
    this.target = null;
  }
  advance(
    dt: number,
    now: number,
    stride: number,
    offset: number,
    auto: boolean,
  ) {
    dt = Math.min(dt, 0.032);
    if (this.dragging) return;
    if (this.target !== null) {
      const distance = this.target - this.position;
      this.velocity += (distance * 145 - this.velocity * 25) * dt;
      this.position += this.velocity * dt;
      if (Math.abs(distance) < 0.15 && Math.abs(this.velocity) < 0.5) {
        this.position = this.target;
        this.velocity = 0;
        this.target = null;
      }
    } else if (now - this.lastInput < 4500 || !auto) {
      this.position += this.velocity * dt;
      this.velocity *= Math.exp(-5.6 * dt);
      if (
        Math.abs(this.velocity) < 12 &&
        now - this.lastInput > 160 &&
        stride
      ) {
        const nearest =
          Math.round((this.position + offset) / stride) * stride - offset;
        if (Math.abs(nearest - this.position) > 0.15) this.target = nearest;
        else this.velocity = 0;
      }
    } else {
      this.velocity += (13 - this.velocity) * (1 - Math.exp(-2 * dt));
      this.position += this.velocity * dt;
    }
  }
  wrap(cycle: number, offset: number) {
    if (!cycle) return;
    const base = cycle - offset;
    const wrapped = ((((this.position - base) % cycle) + cycle) % cycle) + base;
    const shift = wrapped - this.position;
    this.position = wrapped;
    if (this.target !== null) this.target += shift;
  }
}
