const TRACK_COUNT = 7;
const STEP_COUNT = 32;
const TRACK_NAMES = ['SUB BASS', 'TIDAL WAVE', 'ABYSS FM', 'ASTRAL PAD', 'PULSAR', 'NEBULA NOISE', 'VOID TEXTURE'];

let isPlaying = false;
let currentStep = 0;
let tracks = [];
let selectedNote = 'C3';
let currentOctave = 3;
let sequencerData = Array(TRACK_COUNT).fill().map(() => Array(STEP_COUNT).fill(null));

// FX Chain
const delay = new Tone.FeedbackDelay("8n", 0.5).toDestination();
delay.wet.value = 0;

const reverb = new Tone.Reverb({
    decay: 5,
    preDelay: 0.1
}).toDestination();
reverb.wet.value = 0.3;

const filter = new Tone.Filter(20000, "lowpass").toDestination();
const distortion = new Tone.Distortion(0.2).toDestination();
const chorus = new Tone.Chorus(4, 2.5, 0.5).start().toDestination();
const bitcrush = new Tone.BitCrusher(8).toDestination();
// New Ambient FX
const phaser = new Tone.Phaser({
    frequency: 0.5,
    octaves: 3,
    baseFrequency: 350
}).toDestination();
phaser.wet.value = 0;

const tremolo = new Tone.Tremolo(4, 0.75).toDestination().start();
tremolo.wet.value = 0;

const pingPong = new Tone.PingPongDelay("4n", 0.6).toDestination();
pingPong.wet.value = 0;

// Initialize Audio Context on first click
document.addEventListener('click', async () => {
    if (Tone.context.state !== 'running') {
        await Tone.start();
        console.log('Audio Context started');
    }
}, { once: true });

function setupTracks() {
    const SCALE = ['C2', 'G2', 'Eb3', 'G3', 'Bb3', 'C4', 'D4'];

    for (let i = 0; i < TRACK_COUNT; i++) {
        let synth;
        // Audio Chain: Synth -> InsertFX1 -> InsertFX2 -> Filter -> Panner -> Volume -> Destination
        const volume = new Tone.Volume(-12).toDestination();
        const panner = new Tone.Panner((i / TRACK_COUNT) * 2 - 1).connect(volume);
        const trackFilter = new Tone.Filter(2000, "lowpass").connect(panner);

        // Per-Track Insert Effects (initialized based on track type)
        let insertFX1, insertFX2;
        let fxParams = []; // Store definitions for FX knobs

        // Helper for PolySynth Modulation
        // For PolySynths, we often need to restart or use 'set' carefully. 
        // We will use 'set' for parameters that support it.

        switch (i) {
            case 0: // VOID - Deep Sine Pad
                synth = new Tone.PolySynth(Tone.Synth, {
                    oscillator: { type: 'sine' },
                    envelope: { attack: 2, decay: 3, sustain: 0.8, release: 5 }
                });
                // FX1: Chorus
                insertFX1 = new Tone.Chorus(2, 2.5, 0.5).start();
                // FX2: Tremolo
                insertFX2 = new Tone.Tremolo(4, 0.5).start();

                fxParams = [
                    { name: 'CHORUS', min: 0, max: 1, set: (v) => insertFX1.wet.value = v },
                    { name: 'TREM', min: 0, max: 1, set: (v) => insertFX2.wet.value = v }
                ];
                break;

            case 1: // AETHER - High Pad
                synth = new Tone.PolySynth(Tone.Synth, {
                    oscillator: { type: 'triangle' },
                    envelope: { attack: 3, decay: 4, sustain: 0.7, release: 8 }
                });
                insertFX1 = new Tone.Phaser({ frequency: 0.5, octaves: 3, baseFrequency: 350 });
                insertFX2 = new Tone.FeedbackDelay("8n", 0.3);

                fxParams = [
                    { name: 'PHASE', min: 0, max: 1, set: (v) => insertFX1.wet.value = v },
                    { name: 'ECHO', min: 0, max: 1, set: (v) => insertFX2.wet.value = v }
                ];
                break;

            case 2: // CRYSTAL - FM
                synth = new Tone.PolySynth(Tone.FMSynth, { // Use PolySynth wrapper for consistency
                    harmonicity: 3, modulationIndex: 5,
                    envelope: { attack: 0.5, decay: 2, sustain: 0.5, release: 4 }
                });
                insertFX1 = new Tone.BitCrusher(8);
                insertFX2 = new Tone.Chebyshev(20); // Distortion

                fxParams = [
                    { name: 'CRUSH', min: 0, max: 1, set: (v) => insertFX1.wet.value = v },
                    { name: 'DIST', min: 0, max: 1, set: (v) => insertFX2.wet.value = v },
                ];
                break;

            case 3: // RESONANCE - Saw
                synth = new Tone.PolySynth(Tone.Synth, {
                    oscillator: { type: 'sawtooth' },
                    envelope: { attack: 4, decay: 3, sustain: 0.6, release: 6 }
                });
                insertFX1 = new Tone.Filter(800, "highpass"); // Filter sweep effect
                insertFX2 = new Tone.Distortion(0.4);

                fxParams = [
                    { name: 'HPF', min: 0, max: 5000, set: (v) => insertFX1.frequency.value = v },
                    { name: 'DRIVE', min: 0, max: 1, set: (v) => insertFX2.wet.value = v }
                ];
                break;

            case 4: // FLUX - AM Drone
                synth = new Tone.PolySynth(Tone.AMSynth, {
                    harmonicity: 2,
                    envelope: { attack: 3, decay: 2, sustain: 1, release: 8 }
                });
                insertFX1 = new Tone.Tremolo(9, 0.9).start(); // Fast tremolo (ring mod-ish)
                insertFX2 = new Tone.Reverb({ decay: 4, wet: 0.5 }); // Dedicated Reverb

                fxParams = [
                    { name: 'RING', min: 0, max: 1, set: (v) => insertFX1.wet.value = v },
                    { name: 'SPACE', min: 0, max: 1, set: (v) => insertFX2.wet.value = v }
                ];
                break;

            case 5: // CELESTIA - Shimmer
                synth = new Tone.PolySynth(Tone.Synth, {
                    oscillator: { type: 'sine' },
                    envelope: { attack: 1, decay: 1, sustain: 0.8, release: 5 }
                });
                insertFX1 = new Tone.PingPongDelay("4n", 0.4);
                insertFX2 = new Tone.Vibrato(5, 0.2);

                fxParams = [
                    { name: 'DELAY', min: 0, max: 1, set: (v) => insertFX1.wet.value = v },
                    { name: 'WOBBLE', min: 0, max: 1, set: (v) => insertFX2.wet.value = v }
                ];
                break;

            case 6: // ORBIT - Noise/Pulse
                synth = new Tone.PolySynth(Tone.Synth, {
                    oscillator: { type: 'pulse', width: 0.5 },
                    envelope: { attack: 4, decay: 2, sustain: 0.8, release: 8 }
                });
                insertFX1 = new Tone.BitCrusher(4);
                insertFX2 = new Tone.AutoFilter({ frequency: 1, baseFrequency: 200, octaves: 2.6 }).start();

                fxParams = [
                    { name: 'BITS', min: 0, max: 1, set: (v) => insertFX1.wet.value = v },
                    { name: 'SWEEP', min: 0, max: 1, set: (v) => insertFX2.wet.value = v }
                ];
                break;
        }

        // Connect Chain: Synth -> InsertFX1 -> InsertFX2 -> TrackFilter -> Panner -> Volume
        synth.connect(insertFX1);
        insertFX1.connect(insertFX2);
        insertFX2.connect(trackFilter);

        // Global Matrix Sends (Post-Fader)
        // Vital Fix: Connect Sends from VOLUME, not Filter, so the volume knob affects the effects too.
        volume.connect(reverb);
        volume.connect(delay);
        volume.connect(phaser);
        volume.connect(tremolo);
        volume.connect(pingPong);
        volume.connect(chorus);
        volume.connect(distortion);
        volume.connect(bitcrush);

        // Define Synth Params (Params 1 & 2)
        // Re-defining these ensuring they use correct SET syntax for PolySynth
        let synthParams = [];
        if (i === 0) { // Void
            synthParams = [
                { name: 'ATK', min: 0.05, max: 4, set: (v) => synth.set({ envelope: { attack: v } }) },
                { name: 'DET', min: -50, max: 50, set: (v) => synth.set({ detune: v }) }
            ];
        } else if (i === 1) { // Aether
            synthParams = [
                { name: 'ATK', min: 0.1, max: 4, set: (v) => synth.set({ envelope: { attack: v } }) },
                { name: 'REL', min: 0.1, max: 10, set: (v) => synth.set({ envelope: { release: v } }) }
            ];
        } else if (i === 2) { // Crystal (FM)
            synthParams = [
                { name: 'HARM', min: 0.5, max: 8, set: (v) => synth.set({ harmonicity: v }) },
                { name: 'MOD', min: 1, max: 30, set: (v) => synth.set({ modulationIndex: v }) }
            ];
        } else if (i === 3) { // Resonance
            synthParams = [
                { name: 'PORT', min: 0, max: 1, set: (v) => synth.set({ portamento: v }) }, // Portamento if enabled, or just Release
                { name: 'DET', min: -50, max: 50, set: (v) => synth.set({ detune: v }) }
            ];
        } else if (i === 4) { // Flux
            synthParams = [
                { name: 'HARM', min: 0.5, max: 5, set: (v) => synth.set({ harmonicity: v }) },
                { name: 'DET', min: -50, max: 50, set: (v) => synth.set({ detune: v }) }
            ];
        } else if (i === 5) { // Celestia
            synthParams = [
                { name: 'ATK', min: 0.05, max: 4, set: (v) => synth.set({ envelope: { attack: v } }) },
                { name: 'REL', min: 0.5, max: 10, set: (v) => synth.set({ envelope: { release: v } }) }
            ];
        } else if (i === 6) { // Orbit
            synthParams = [
                { name: 'WIDTH', min: 0, max: 0.9, set: (v) => synth.set({ oscillator: { width: v } }) },
                { name: 'DET', min: -50, max: 50, set: (v) => synth.set({ detune: v }) }
            ];
        }

        // Ensure Volume is reasonable
        volume.volume.value = -10;

        tracks.push({
            id: i,
            name: TRACK_NAMES[i],
            instrument: synth,
            volume: volume,
            filter: trackFilter,
            panner: panner,
            note: SCALE[i],
            params: synthParams,
            fxParams: fxParams
        });
    }
}

function createUI() {
    const grid = document.getElementById('sequencer-grid');
    grid.innerHTML = '';

    tracks.forEach((track, trackIdx) => {
        const row = document.createElement('div');
        row.className = 'track-row';

        const info = document.createElement('div');
        info.className = 'track-info';

        const nameBadge = document.createElement('div');
        nameBadge.className = 'track-name-badge';
        nameBadge.innerHTML = `<div class="track-name">${track.name}</div>`;
        info.appendChild(nameBadge);

        const paramsGrid = document.createElement('div');
        paramsGrid.className = 'track-params-grid';

        // Helper to make knobs
        const createKnob = (label, min, max, initial, updateFn) => {
            const container = document.createElement('div');
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.alignItems = 'center';
            container.style.gap = '2px';

            const knob = document.createElement('div');
            knob.className = 'knob-mini';
            knob.title = label;

            // Visual label
            const lbl = document.createElement('div');
            lbl.textContent = label;
            lbl.style.fontSize = '8px';
            lbl.style.color = '#777';
            lbl.style.fontFamily = 'monospace';
            container.appendChild(lbl);
            container.appendChild(knob);

            let currentVal = initial;
            let startY;

            // Visual update
            const updateVisual = () => {
                // Map min-max to rotation -140 to 140
                const pct = (currentVal - min) / (max - min);
                const deg = -140 + (pct * 280);
                knob.style.transform = `rotate(${deg}deg)`;
            };

            // Initial call
            updateVisual();
            // Trigger updateFn once to ensure synth matches UI IF necessary, 
            // but we usually trust the synth defaults. 
            // However, our range logic assumes linear mapping. 
            // We won't force updateFn on init to avoid overwriting careful defaults,
            // but we will sync the visual to the approx initial value.

            knob.addEventListener('mousedown', (e) => {
                startY = e.clientY;
                const onMouseMove = (ev) => {
                    const diff = startY - ev.clientY;
                    const sensitivity = (max - min) / 200;
                    currentVal = Math.max(min, Math.min(max, currentVal + (diff * sensitivity)));
                    updateFn(currentVal);
                    updateVisual();
                    startY = ev.clientY;
                };
                const onMouseUp = () => {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                };
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });

            return container;
        };

        // Knob 1: VOL
        paramsGrid.appendChild(createKnob('VOL', -60, 0, -12, (v) => track.volume.volume.value = v));

        // Knob 2: CUT
        // Using a simple linear mapping here for simplicity, although freq is logarithmic.
        paramsGrid.appendChild(createKnob('CUT', 20, 5000, 2000, (v) => track.filter.frequency.value = v));

        // Knob 3: DUR (Duration/Release)
        // Maps generic release 0.1s to 8s
        // We use a small helper to safely set release on any synth type provided in setupTracks
        paramsGrid.appendChild(createKnob('DUR', 0.1, 8, 3, (v) => {
            const synth = track.instrument;
            if (synth.envelope) {
                synth.envelope.release = v;
            } else if (synth instanceof Tone.PolySynth) {
                synth.set({ envelope: { release: v } });
            } else if (synth instanceof Tone.FMSynth) {
                synth.envelope.release = v;
                if (synth.modulationEnvelope) synth.modulationEnvelope.release = v;
            }
        }));

        // Knob 4 & 5: Custom Params (Synth)
        if (track.params && track.params.length >= 2) {
            const p1 = track.params[0];
            paramsGrid.appendChild(createKnob(p1.name, p1.min, p1.max, p1.min + (p1.max - p1.min) * 0.3, p1.set));

            const p2 = track.params[1];
            paramsGrid.appendChild(createKnob(p2.name, p2.min, p2.max, p2.min + (p2.max - p2.min) * 0.3, p2.set));
        }

        // Knob 6 & 7: Insert FX Params
        if (track.fxParams && track.fxParams.length >= 2) {
            const fx1 = track.fxParams[0];
            // Default wet usually 0 or low, let's start at 0.2 (20%)
            // Min/Max are usually 0-1 for wet
            paramsGrid.appendChild(createKnob(fx1.name, fx1.min, fx1.max, fx1.min + (fx1.max - fx1.min) * 0.2, fx1.set));

            const fx2 = track.fxParams[1];
            paramsGrid.appendChild(createKnob(fx2.name, fx2.min, fx2.max, fx2.min + (fx2.max - fx2.min) * 0.2, fx2.set));
        }

        info.appendChild(paramsGrid);
        row.appendChild(info);

        const stepGrid = document.createElement('div');
        stepGrid.className = 'step-grid';

        for (let stepIdx = 0; stepIdx < STEP_COUNT; stepIdx++) {
            const step = document.createElement('div');
            step.className = 'step';
            step.dataset.track = trackIdx;
            step.dataset.step = stepIdx;
            step.addEventListener('click', () => {
                if (sequencerData[trackIdx][stepIdx] === selectedNote) {
                    sequencerData[trackIdx][stepIdx] = null;
                    step.classList.remove('active');
                    step.textContent = '';
                } else {
                    sequencerData[trackIdx][stepIdx] = selectedNote;
                    step.classList.add('active');
                    step.textContent = selectedNote.replace(/[0-9]/, '');
                }
            });
            stepGrid.appendChild(step);
        }

        row.appendChild(stepGrid);
        grid.appendChild(row);
    });
}

function updateKeyboard() {
    const kb = document.getElementById('keyboard');
    kb.innerHTML = '';
    const notesBase = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const oct = currentOctave;
    const notes = notesBase.map(n => n + oct).concat(['C' + (oct + 1)]);

    notes.forEach(note => {
        const key = document.createElement('div');
        key.className = `key ${note.includes('#') ? 'black' : 'white'} ${note === selectedNote ? 'selected' : ''}`;
        key.dataset.note = note;
        key.addEventListener('mousedown', () => {
            selectedNote = note;
            document.querySelectorAll('.key').forEach(k => k.classList.remove('selected'));
            key.classList.add('selected');
            tracks[1].instrument.triggerAttackRelease(note, "4n");
        });
        kb.appendChild(key);
    });
}

function repeat(time) {
    const step = currentStep % STEP_COUNT;
    const allSteps = document.querySelectorAll('.step');
    allSteps.forEach(s => s.classList.remove('current'));
    const stepsAtThisIdx = document.querySelectorAll(`.step[data-step="${step}"]`);
    stepsAtThisIdx.forEach(s => s.classList.add('current'));

    for (let i = 0; i < TRACK_COUNT; i++) {
        const activeNote = sequencerData[i][step];
        if (activeNote) {
            const track = tracks[i];
            let duration = "2n";
            if (track.instrument.triggerAttackRelease) {
                track.instrument.triggerAttackRelease(activeNote, duration, time);
            } else if (track.instrument.triggerAttack) {
                track.instrument.triggerAttack(activeNote, time);
                track.instrument.triggerRelease(time + Tone.Time(duration));
            }
        }
    }
    currentStep++;
}

function setupControls() {
    const playBtn = document.getElementById('play-btn');
    const stopBtn = document.getElementById('stop-btn');
    const clearBtn = document.getElementById('clear-btn');
    const bpmKnob = document.getElementById('bpm-knob');
    const bpmDisplay = document.getElementById('bpm-display');
    const volKnob = document.getElementById('master-vol-knob');
    const volDisplay = document.getElementById('vol-display');

    let startY_bpm, currentBPM = 120;
    bpmKnob.addEventListener('mousedown', (e) => {
        startY_bpm = e.clientY;
        const onMouseMove = (e) => {
            const diff = startY_bpm - e.clientY;
            currentBPM = Math.min(220, Math.max(40, currentBPM + diff));
            Tone.Transport.bpm.value = currentBPM;
            bpmDisplay.textContent = Math.round(currentBPM);
            bpmKnob.style.transform = `rotate(${(currentBPM - 120) * 1.5}deg)`;
            startY_bpm = e.clientY;
        };
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });

    let startY_vol, currentVol = -12;
    volKnob.addEventListener('mousedown', (e) => {
        startY_vol = e.clientY;
        const onMouseMove = (e) => {
            const diff = (startY_vol - e.clientY) * 0.5;
            currentVol = Math.min(0, Math.max(-60, currentVol + diff));
            Tone.Destination.volume.value = currentVol;
            volDisplay.textContent = Math.round(currentVol) + 'dB';
            volKnob.style.transform = `rotate(${(currentVol + 12) * 4}deg)`;
            startY_vol = e.clientY;
        };
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });

    playBtn.addEventListener('click', () => {
        if (isPlaying) {
            isPlaying = false;
            Tone.Transport.pause();
            playBtn.textContent = 'PLAY';
        } else {
            isPlaying = true;
            Tone.Transport.start();
            playBtn.textContent = 'PAUSE';
        }
    });

    stopBtn.addEventListener('click', () => {
        isPlaying = false;
        Tone.Transport.stop();
        currentStep = 0;
        playBtn.textContent = 'PLAY';
        document.querySelectorAll('.step').forEach(s => s.classList.remove('current'));
    });

    clearBtn.addEventListener('click', () => {
        sequencerData = Array(TRACK_COUNT).fill().map(() => Array(STEP_COUNT).fill(null));
        document.querySelectorAll('.step').forEach(s => {
            s.classList.remove('active');
            s.textContent = '';
        });
    });

    const octUp = document.getElementById('octave-up');
    const octDown = document.getElementById('octave-down');
    const octDisplay = document.getElementById('octave-display');

    octUp.addEventListener('click', () => {
        if (currentOctave < 6) {
            currentOctave++;
            octDisplay.textContent = currentOctave;
            updateKeyboard();
        }
    });

    octDown.addEventListener('click', () => {
        if (currentOctave > 1) {
            currentOctave--;
            octDisplay.textContent = currentOctave;
            updateKeyboard();
        }
    });

    document.querySelectorAll('.fx-param').forEach(input => {
        input.addEventListener('input', (e) => {
            const fxType = e.target.dataset.fx;
            const val = parseFloat(e.target.value);
            switch (fxType) {
                case 'delay': delay.wet.value = val; break;
                case 'reverb': reverb.wet.value = val; break;
                case 'crush': bitcrush.bits.value = val; break;
                case 'chorus': chorus.wet.value = val; break;
                case 'dist': distortion.distortion = val; break;
                case 'filter': filter.frequency.value = val; break;
                case 'phaser': phaser.wet.value = val; break;
                case 'tremolo': tremolo.wet.value = val; break;
                case 'pingpong': pingPong.wet.value = val; break;
            }
        });
    });
}

async function init() {
    setupTracks();
    createUI();
    updateKeyboard();
    setupControls();
    Tone.Transport.scheduleRepeat((time) => { repeat(time); }, "16n");
    Tone.Transport.bpm.value = 120;
}

init();
