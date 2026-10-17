# THE SOUNDS, MEASURED (the supervisor's S1): for each surface's WAV (runs/sound/<surface>.wav, rendered by the game's own synthesizer):
# the roll's level and its spectral centroid (each surface its own), and the seams: energy in the clack band during a clack against the
# roll between clacks — at least 10 dB. Exit 1 if a surface with seams falls short, or two rolls are the same sound.
import wave, struct, math, sys, cmath, os, json
D = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..', 'runs', 'sound'); R = 44100; fail = 0; rolls = {}   # the WAVs' folder (a round's own, or runs/sound)
SOUND = json.load(open(os.path.join(D, 'sound_config.json')))   # the game's own settings, written by the sound drive beside the WAVs
BAND = (SOUND['clack']['band'] / 1.14, SOUND['clack']['band'] * 1.14)
def load(s):
    w = wave.open(os.path.join(D, s + '.wav')); n = w.getnframes(); return [v / 32768 for v in struct.unpack('<%dh' % n, w.readframes(n))]
def band(x, lo, hi):  # crude band energy: a 2-pole resonator bank would do; here, the FFT of a Hann window
    N = len(x); win = [0.5 - 0.5 * math.cos(2 * math.pi * i / (N - 1)) for i in range(N)]; X = fft([x[i] * win[i] for i in range(N)])
    return sum(abs(X[k]) ** 2 for k in range(1, N // 2) if lo <= k * R / N <= hi) / N
def fft(a):
    n = len(a)
    if n == 1: return [complex(a[0])]
    e, o = fft(a[0::2]), fft(a[1::2]); t = [cmath.exp(-2j * math.pi * k / n) * o[k] for k in range(n // 2)]
    return [e[k] + t[k] for k in range(n // 2)] + [e[k] - t[k] for k in range(n // 2)]
def centroid(x):
    N = len(x); X = fft(x); s = sum(abs(X[k]) for k in range(1, N // 2)); return sum(k * R / N * abs(X[k]) for k in range(1, N // 2)) / max(1e-9, s)
J = SOUND['joints']
for s in ['slab', 'pavers', 'deck', 'ramp', 'granite', 'curb', 'rail']:
    x = load(s); seg = x[int(0.1 * R):int(0.1 * R) + 4096]
    rms = math.sqrt(sum(v * v for v in seg) / len(seg)); c = centroid(seg); rolls[s] = (20 * math.log10(max(1e-9, rms)), c)
    line = s.ljust(8) + ' roll %.1f dB RMS, centroid %4.0f Hz' % rolls[s]
    if s in J:
        # every joint of the roll's first 2 s (each clack is a burst from a random place in the noise: one alone is a sample, not a measure)
        eon = eoff = 0.0; k = 0; t0 = J[s] / 5.0
        while t0 < 2.0:
            on = x[int((t0 - 0.002) * R):int((t0 - 0.002) * R) + 1024]; mid = t0 + J[s] / 10.0 if J[s] > 1 else t0 + 0.045
            off = x[int(mid * R):int(mid * R) + 1024]; eon += band(on, *BAND); eoff += band(off, *BAND); k += 1; t0 += J[s] / 5.0
        d = 10 * math.log10(max(1e-12, eon) / max(1e-12, eoff))
        line += ' · seams +%.1f dB over the roll in their band (%.1f–%.1f kHz, %d joints)' % (d, BAND[0] / 1000, BAND[1] / 1000, k)
        if d < 10: fail += 1; line += '  ✖'
    print(line)
# each surface's own character, against the smooth slab: the hollow deck rings low (100–220 Hz), the coarse pavers hiss high (5–8 kHz);
# and nothing clips (the loudest sample under full scale)
def share(x, lo, hi): return band(x, lo, hi) / max(1e-12, band(x, 20, 20000))
seg = lambda s2: load(s2)[int(0.1 * R):int(0.1 * R) + 4096]
slab = seg('slab'); deck_boom = 10 * math.log10(share(seg('deck'), 100, 220) / max(1e-12, share(slab, 100, 220))); pav_hiss = 10 * math.log10(share(seg('pavers'), 5000, 8000) / max(1e-12, share(slab, 5000, 8000)))
ok_c = deck_boom >= 6 and pav_hiss >= 6; fail += 0 if ok_c else 1
print(('✔' if ok_c else '✖') + ' character against the slab: the deck rings low +%.1f dB (100–220 Hz), the pavers hiss high +%.1f dB (5–8 kHz) — each ≥ 6' % (deck_boom, pav_hiss))
peaks = {s2: max(abs(v) for v in load(s2)) for s2 in ['slab', 'pavers', 'deck', 'ramp', 'granite', 'curb', 'rail']}
clip = [s2 for s2, pk in peaks.items() if pk >= 0.999]; fail += 1 if clip else 0
print(('✖' if clip else '✔') + ' no clipping: loudest samples ' + ', '.join('%s %.2f' % (k2, v2) for k2, v2 in peaks.items()) + ((' — CLIPPED: ' + ', '.join(clip)) if clip else ''))
names = list(rolls)
for i in range(len(names)):
    for j in range(i + 1, len(names)):
        a, b = rolls[names[i]], rolls[names[j]]
        if names[i] != 'rail' and names[j] != 'rail' and abs(a[0] - b[0]) < 0.8 and abs(a[1] - b[1]) / max(a[1], b[1]) < 0.08: fail += 1; print('✖ %s and %s roll the same' % (names[i], names[j]))
print('SOUND: RED' if fail else 'SOUND: GREEN'); sys.exit(1 if fail else 0)
