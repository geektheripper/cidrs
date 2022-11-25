import { IpRange, IpRanges } from "./intervals.js"

export class IP {
  readonly value: number
  readonly array: [number, number, number, number]
  readonly raw: string
  constructor(address: string | number) {
    if (typeof address === 'number') {
      if (address < 0 && address >= 2 ** 32) throw `ip out of range: ${address}`
      this.value = address
      this.array = [
        (address >> 24) & 255,
        (address >> 16) & 255,
        (address >> 8) & 255,
        (address) & 255,
      ]
      this.raw = this.array.join('.')
      return
    }

    const result = address.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (!result) throw `illegal ip: ${address}`;

    const [, ...parts] = result.map(i => Number(i)) as [number, number, number, number, number];
    for (const p of parts) if (isNaN(p) || p < 0 || p > 255) throw `illegal ip: ${address}`
    this.raw = address
    this.array = parts;
    this.value = (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3]
  }
  toString() { return this.raw }
  toJSON() { return this.raw }
  next() { return new IP(this.value + 1) }
  prev() { return new IP(this.value - 1) }
}

export class CIDR {
  constructor(readonly address: IP, readonly prefixLength: number) { }

  readonly addressNum = 2 ** (32 - this.prefixLength)
  readonly networkAddress = new IP(Math.floor(this.address.value / this.addressNum) * this.addressNum)
  readonly broadcastAddress = new IP(this.networkAddress.value + this.addressNum - 1)
  readonly range = [this.networkAddress, this.broadcastAddress] as const
  readonly availableAddressNum = Math.max(this.addressNum - 2, 0)
  readonly firstAvailableAddress = this.prefixLength > 30 ? null : this.networkAddress.next()
  readonly lastAvailableAddress = this.prefixLength > 30 ? null : this.broadcastAddress.prev()
  readonly hostRange = this.prefixLength > 30 ? null : [this.firstAvailableAddress, this.lastAvailableAddress] as [IP, IP]
  #maskIP = new IP(2 ** 32 - this.addressNum)
  readonly mask = this.#maskIP.raw

  #range = new IpRange(this.networkAddress.value, this.broadcastAddress.value + 1)
  #pool = new IpRanges().setBoundary(this.#range)

  static fromString(cidr: string) {
    const result = cidr.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\/(\d{1,2})$/);
    if (!result) throw `illegal cidr: ${cidr}`;

    const [, ip, _prefixLength] = result

    const prefixLength = Number(_prefixLength)
    if (isNaN(prefixLength) || prefixLength < 0 || prefixLength > 32) throw `illegal prefix: ${cidr}`

    return new CIDR(new IP(ip as string), prefixLength)
  }
  toString() { return `${this.networkAddress.raw}/${this.prefixLength}` }

  contains(item: IP | CIDR) {
    const [min, max] = this.range
    if (item instanceof IP) return item.value >= min.value && item.value <= max.value
    const [iMin, iMax] = item.range
    return iMin.value >= min.value && iMax.value <= max.value
  }
  mkSubnets(prefixIncrement: number, start = 0, end?: number) {
    const subnetPrefixLength = prefixIncrement + this.prefixLength;
    if (prefixIncrement + this.prefixLength >= 32) throw `illegal prefix length: ${subnetPrefixLength}`

    const subnetAddressNum = 2 ** (32 - subnetPrefixLength)
    const subnetNum = this.addressNum / subnetAddressNum

    if (start < 0) start += subnetNum
    if (typeof end === 'number' && end < 0) end += subnetNum
    if (!end) end = subnetNum

    if (start >= subnetNum || start < 0) throw `subnet start index out of range: ${start}`
    if (end > subnetNum || end < 0) throw `subnet end index out of range: ${start}`
    if (end <= start) throw `illegal index range: ${end} to ${start}`

    const result: CIDR[] = [];
    for (let i = start; i < end; i++) {
      const subnetStartAt = this.address.value + subnetAddressNum * i
      result.push(new CIDR(new IP(subnetStartAt), subnetPrefixLength))
    }
    return result
  }
  allocateSubnets(prefixIncrement: number, start = 0, end?: number) {
    const subnets = this.mkSubnets(prefixIncrement, start, end)
    for (const sn of subnets) {
      try { this.#pool.insert(sn.#range) } catch { throw `subnet already allocated: ${sn.toString()}` }
    }
    return subnets
  }
  take(cidr: CIDR) { this.#pool.insert(cidr.#range); return cidr }
  fromRange(range: IpRange) {
    const prefixLength = 32 - Math.log2(range.length)
    if (!Number.isInteger(prefixLength)) throw `illegal network capacity: ${range.length}`

    const start = new IP(range.start);
    const end = new IP(range.end);
    const cidr = new CIDR(start, prefixLength)
    if (cidr.networkAddress.value === range.start && cidr.broadcastAddress.value === range.end - 1) return cidr

    throw `illegal CIDR network range: ${start} - ${end}`
  }
  printNonAllocatedAddress() {
    const [ranges, count] = this.#pool.availableRanges();
    console.log(
      ranges.map(i => {
        const start = new IP(i.start);
        const end = new IP(i.end);
        let result = `${start} - ${end} (${i.length})`
        try {
          result += ` (${this.fromRange(i)})`
        } catch {
          // 
        }
        return result
      }).join('\n') + `\ntotal (${count})`
    )
  }
}
