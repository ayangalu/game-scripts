export function hex(value: number, length?: number) {
	const x = value.toString(16);

	if (typeof length === 'number') {
		return `0x${x.padStart(length, '0')}`;
	}

	const nextPower = Math.pow(2, Math.ceil(Math.log2(x.length)));

	return `0x${x.padStart(nextPower === 1 ? 2 : nextPower, '0')}`;
}
