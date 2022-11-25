export class IpRange {
  constructor(public start: number, public end: number) {
    if (this.start > this.end) throw "illegal ip";
  }
  get length() {
    return this.end - this.start;
  }
  toString() {
    return `[${this.start}, ${this.end})`;
  }
  includes(interval: IpRange): boolean;
  includes(number: number): boolean;
  includes(v: IpRange | number) {
    if (typeof v === "number") return v >= this.start && v < this.end;
    return v.start >= this.start && v.end <= this.end;
  }
  isEmpty() {
    return (this.start = this.end);
  }
  intersectionTest(
    v: IpRange
  ): [intersected: boolean, touched: boolean, start: number, end: number] {
    const start = Math.max(v.start, this.start);
    const end = Math.min(v.end, this.end);
    return [end > start, end === start, start, end];
  }
  // intersect(v: Interval) {
  //   const [intersected, , start, end] = this.intersectionTest(v);
  //   if (!intersected) return false
  //   return new Interval(start, end)
  // }
  // union(v: Interval) {
  //   const [intersected, touched] = this.intersectionTest(v);
  //   if (intersected || touched) {
  //     return new Interval(Math.min(v.start, this.start), Math.max(v.end, this.end))
  //   }
  //   return false
  // }
  enroll(v: IpRange) {
    const [intersected, touched] = this.intersectionTest(v);
    if (!intersected && !touched)
      throw "cant't merge, not intersected or touched";
    this.start = Math.min(v.start, this.start);
    this.end = Math.max(v.end, this.end);
  }
  // unionWithoutIntersect(v: Interval) {
  //   const [touched] = this.intersectionTest(v);
  //   if (!touched) return false
  //   return this.union(v)
  // }
}

export class IpRanges {
  public ranges: IpRange[] = [];
  public boundary = new IpRange(0, 2 ** 32);
  // constructor() { }
  setBoundary(boundary: IpRange) {
    this.boundary = boundary;
    return this;
  }
  insert(interval: IpRange) {
    if (this.boundary && !this.boundary.includes(interval))
      throw "ip interval out of boundary";
    if (!this.ranges.length) {
      this.ranges.push(interval);
      return;
    }
    for (let i = 0; i < this.ranges.length; i++) {
      const curr = this.ranges[i] as IpRange;
      const [currIntersected, currTouched] = interval.intersectionTest(curr);
      if (currIntersected) throw `intersected intervals`;

      if (currTouched) {
        const result = new IpRange(interval.start, interval.end);
        result.enroll(curr);

        const next = this.ranges[i + 1];
        if (next) {
          const [nextIntersected, nextTouched] =
            interval.intersectionTest(next);
          if (nextIntersected) throw `intersected intervals`;
          if (nextTouched) {
            result.enroll(curr);
            this.ranges.splice(i, 2, result);
            return;
          }
        }
        this.ranges.splice(i, 1, result);
        return;
      }

      if (interval.end < curr.start) {
        this.ranges.splice(i, 0, interval);
        return;
      }
    }
    this.ranges.push(interval);
  }
  availableRanges(): [ranges: IpRange[], count: number] {
    if (!this.ranges.length) return [[this.boundary], this.boundary.length];

    const result: IpRange[] = [];
    const first = this.ranges[0];
    if (first && first.start > this.boundary.start) {
      result.push(new IpRange(this.boundary.start, first.start));
    }
    for (let i = 0; i < this.ranges.length; i++) {
      const curr = this.ranges[i] as IpRange;
      const next = this.ranges[i + 1];
      if (next) {
        result.push(new IpRange(curr.end, next.start));
      } else if (curr.end < this.boundary.end) {
        result.push(new IpRange(curr.end, this.boundary.end));
      }
    }

    return [result, result.reduce((p, c) => p + c.length, 0)];
  }
}
