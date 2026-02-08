const TRACK_COUNT = 7;
const STEP_COUNT = 32;
// Updated names for melodic theme
const TRACK_NAMES = ['DEEP OCEAN', 'SOFT PAD', 'GLASS BELL', 'CALM PULSE', 'AIRY VOX', 'WARM DRONE', 'SILKY RAIN'];

let isPlaying = false;
let currentStep = 0;
let tracks = [];
let selectedNote = 'C3';
let currentOctave = 3;
let sequencerData = Array(TRACK_COUNT).fill().map(() => Array(STEP_COUNT).fill(null));
let isGlobalFxActive = true;

// FX Chain - Initialized later
let delay, reverb, filter, distortion, chorus, bitcrush;
let phaser, tremolo, pingPong;

// Start Button Handler
// Start Button Handler
document.addEventListener('DOMContentLoaded', () => {
    const initBtn = document.getElementById('init-btn');
    const overlay = document.getElementById('start-overlay');

    // Add event listener to existant button
    if (initBtn) {
        initBtn.addEventListener('click', async () => {
            try {
                // Ensure Tone is started
                await Tone.start();
                console.log('Audio Context started');

                // Initialize Audio Chain
                setupAudio();

                // Initialize System
                await init();

                // Hide Overlay
                overlay.style.opacity = '0';
                setTimeout(() => {
                    overlay.style.display = 'none';
                }, 500);
            } catch (err) {
                console.error(err);
                alert("Failed to start audio engine: " + err);
            }
        });
    }
});

function setupAudio() {
    delay = new Tone.FeedbackDelay("8n", 0.5).toDestination();
    delay.wet.value = 0;

    reverb = new Tone.Reverb({
        decay: 8,
        preDelay: 0.2
    }).toDestination();
    reverb.wet.value = 0.3;

    filter = new Tone.Filter(20000, "lowpass").toDestination();
    distortion = new Tone.Distortion(0.05).toDestination();
    chorus = new Tone.Chorus(2, 2.5, 0.5).start().toDestination();
    bitcrush = new Tone.BitCrusher(8).toDestination();

    phaser = new Tone.Phaser({
        frequency: 0.2,
        octaves: 2,
        baseFrequency: 350
    }).toDestination();
    phaser.wet.value = 0;

    tremolo = new Tone.Tremolo(3, 0.5).toDestination().start();
    tremolo.wet.value = 0;

    pingPong = new Tone.PingPongDelay("4n", 0.4).toDestination();
    pingPong.wet.value = 0;
}

function setupTracks() {
    // LOWER OCTAVES for deep ambient.
    const SCALE = ['C1', 'G1', 'C2', 'Eb2', 'G2', 'Bb2', 'C3'];

    for (let i = 0; i < TRACK_COUNT; i++) {
        let synth;
        const volume = new Tone.Volume(-15).toDestination(); // Quieter default
        const panner = new Tone.Panner((i / TRACK_COUNT) * 2 - 1).connect(volume);
        const trackFilter = new Tone.Filter(600, "lowpass").connect(panner); // Lower filter for softer sound

        let insertFX1, insertFX2;
        let fxParams = [];

        // Melodic Quiet Long Sounds Setup
        switch (i) {
            case 0: // DEEP OCEAN - Sine Sub
                synth = new Tone.PolySynth(Tone.Synth, {
                    oscillator: { type: 'sine' },
                    envelope: { attack: 2, decay: 4, sustain: 0.8, release: 8 }
                });
                insertFX1 = new Tone.Chorus(1.5, 2.5, 0.3).start();
                insertFX2 = new Tone.Tremolo(3, 0.3).start();
                fxParams = [
                    { name: 'CHORUS', min: 0, max: 1, set: (v) => insertFX1.wet.value = v },
                    { name: 'TREM', min: 0, max: 1, set: (v) => insertFX2.wet.value = v }
                ];
                break;

            case 1: // SOFT PAD - Triangle
                synth = new Tone.PolySynth(Tone.Synth, {
                    oscillator: { type: 'triangle' },
                    envelope: { attack: 3, decay: 4, sustain: 0.7, release: 10 }
                });
                insertFX1 = new Tone.Phaser({ frequency: 0.1, octaves: 2, baseFrequency: 200 });
                insertFX2 = new Tone.FeedbackDelay("2n", 0.3);
                fxParams = [
                    { name: 'PHASE', min: 0, max: 1, set: (v) => insertFX1.wet.value = v },
                    { name: 'ECHO', min: 0, max: 1, set: (v) => insertFX2.wet.value = v }
                ];
                break;

            case 2: // GLASS BELL - FM Sine
                synth = new Tone.PolySynth(Tone.FMSynth, {
                    harmonicity: 2, modulationIndex: 3,
                    oscillator: { type: 'sine' },
                    modulation: { type: 'sine' },
                    envelope: { attack: 1, decay: 3, sustain: 0.5, release: 8 },
                    modulationEnvelope: { attack: 0.5, decay: 2, sustain: 0.2, release: 6 }
                });
                insertFX1 = new Tone.Chebyshev(2); // Very subtle
                insertFX2 = new Tone.Reverb({ decay: 5, wet: 0.4 });
                fxParams = [
                    { name: 'COLOR', min: 0, max: 1, set: (v) => insertFX1.wet.value = v },
                    { name: 'SPACE', min: 0, max: 0.8, set: (v) => insertFX2.wet.value = v },
                ];
                break;

            case 3: // CALM PULSE - Pulse with width LFO? Plain Pulse filtered
                synth = new Tone.PolySynth(Tone.Synth, {
                    oscillator: { type: 'pulse', width: 0.5 },
                    envelope: { attack: 4, decay: 3, sustain: 0.6, release: 9 }
                });
                insertFX1 = new Tone.Filter(400, "lowpass"); // Extra filter
                insertFX2 = new Tone.Tremolo(4, 0.6).start();
                fxParams = [
                    { name: 'DAMP', min: 100, max: 2000, set: (v) => insertFX1.frequency.value = v },
                    { name: 'SHAKE', min: 0, max: 1, set: (v) => insertFX2.wet.value = v }
                ];
                break;

            case 4: // AIRY VOX - AM Synth
                synth = new Tone.PolySynth(Tone.AMSynth, {
                    harmonicity: 1.25,
                    oscillator: { type: 'sine' },
                    envelope: { attack: 3, decay: 3, sustain: 0.8, release: 10 }
                });
                insertFX1 = new Tone.Vibrato(5, 0.2);
                insertFX2 = new Tone.Reverb({ decay: 7, wet: 0.5 });
                fxParams = [
                    { name: 'VIB', min: 0, max: 1, set: (v) => insertFX1.wet.value = v },
                    { name: 'AIR', min: 0, max: 1, set: (v) => insertFX2.wet.value = v }
                ];
                break;

            case 5: // WARM DRONE - Fat Sawtooth (Filtered)
                synth = new Tone.PolySynth(Tone.Synth, {
                    oscillator: { type: 'fatsawtooth', count: 3, spread: 20 },
                    envelope: { attack: 5, decay: 4, sustain: 0.8, release: 12 }
                });
                insertFX1 = new Tone.AutoFilter({ frequency: 0.1, baseFrequency: 100, octaves: 3 }).start();
                insertFX2 = new Tone.PingPongDelay("2n", 0.4);
                fxParams = [
                    { name: 'WASH', min: 0, max: 1, set: (v) => insertFX1.wet.value = v },
                    { name: 'BOUNCE', min: 0, max: 1, set: (v) => insertFX2.wet.value = v }
                ];
                break;

            case 6: // SILKY RAIN - White Noise? No, maybe high FM
                synth = new Tone.PolySynth(Tone.FMSynth, {
                    harmonicity: 8, modulationIndex: 5,
                    oscillator: { type: 'sine' },
                    modulation: { type: 'triangle' },
                    envelope: { attack: 4, decay: 3, sustain: 0.5, release: 10 }
                });
                insertFX1 = new Tone.Phaser({ frequency: 0.5, octaves: 1, baseFrequency: 500 });
                insertFX2 = new Tone.BitCrusher(12); // Light Crush
                fxParams = [
                    { name: 'MIST', min: 0, max: 1, set: (v) => insertFX1.wet.value = v },
                    { name: 'GRIT', min: 0, max: 1, set: (v) => insertFX2.wet.value = v }
                ];
                break;
        }

        synth.connect(insertFX1);
        insertFX1.connect(insertFX2);
        insertFX2.connect(trackFilter);

        // Sends
        volume.connect(reverb);
        volume.connect(delay);
        volume.connect(phaser);
        volume.connect(tremolo);
        volume.connect(pingPong);
        volume.connect(chorus);
        volume.connect(distortion);
        volume.connect(bitcrush);

        // Params
        let synthParams = [];
        // Generic params for all melodic synths
        synthParams = [
            {
                name: 'ATK', min: 0.1, max: 5, set: (v) => {
                    if (synth.envelope) synth.envelope.attack = v;
                    else synth.set({ envelope: { attack: v } });
                }
            },
            {
                name: 'REL', min: 0.5, max: 15, set: (v) => {
                    if (synth.envelope) synth.envelope.release = v;
                    else synth.set({ envelope: { release: v } });
                }
            }
        ];

        tracks.push({
            id: i,
            name: TRACK_NAMES[i],
            instrument: synth,
            volume: volume,
            filter: trackFilter,
            panner: panner,
            note: SCALE[i],
            params: synthParams,
            fxParams: fxParams,
            active: true // New Active/Mute State
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

        // ACTIVE / MUTE BUTTON - Fixed layout
        const muteContainer = document.createElement('div');
        muteContainer.style.display = 'flex';
        muteContainer.style.alignItems = 'center';

        const muteBtn = document.createElement('div');
        muteBtn.className = 'track-mute-btn active'; // Starts active
        muteBtn.title = 'Active/Mute';
        muteBtn.addEventListener('click', () => {
            track.active = !track.active;
            if (track.active) {
                muteBtn.classList.add('active');
            } else {
                muteBtn.classList.remove('active');
            }
        });
        muteContainer.appendChild(muteBtn);
        info.appendChild(muteContainer);

        const nameBadge = document.createElement('div');
        nameBadge.className = 'track-name-badge';
        nameBadge.innerHTML = `<div class="track-name">${track.name}</div>`;
        info.appendChild(nameBadge);

        const paramsGrid = document.createElement('div');
        paramsGrid.className = 'track-params-grid';

        const createKnob = (label, min, max, initial, updateFn) => {
            const container = document.createElement('div');
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.alignItems = 'center';
            container.style.gap = '2px';

            const knob = document.createElement('div');
            knob.className = 'knob-mini';
            knob.title = label;

            const lbl = document.createElement('div');
            lbl.textContent = label;
            lbl.style.fontSize = '8px';
            lbl.style.color = '#777';
            lbl.style.fontFamily = 'monospace';
            container.appendChild(lbl);
            container.appendChild(knob);

            let currentVal = initial;
            let startY;

            const updateVisual = () => {
                const pct = (currentVal - min) / (max - min);
                const deg = -140 + (pct * 280);
                knob.style.transform = `rotate(${deg}deg)`;
            };

            updateVisual();

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

        // VOL
        paramsGrid.appendChild(createKnob('VOL', -60, 0, -15, (v) => track.volume.volume.value = v));
        // FILTER
        paramsGrid.appendChild(createKnob('CUT', 20, 5000, 600, (v) => track.filter.frequency.value = v));

        // Custom Params
        if (track.params) {
            track.params.forEach(p => {
                paramsGrid.appendChild(createKnob(p.name, p.min, p.max, p.min + (p.max - p.min) * 0.5, p.set));
            });
        }
        // Insert FX Params
        if (track.fxParams) {
            track.fxParams.forEach(p => {
                paramsGrid.appendChild(createKnob(p.name, p.min, p.max, p.min + (p.max - p.min) * 0.2, p.set));
            });
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
        // CHECK ACTIVE STATE
        if (!tracks[i].active) continue;

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

// Logic to apply FX settings depending on global toggle
function applyGlobalFx() {
    const inputs = document.querySelectorAll('.fx-param');
    inputs.forEach(input => {
        const fxType = input.dataset.fx;
        const param = input.dataset.param;
        const val = parseFloat(input.value);

        // If FX is OFF, we generally want Wet = 0 or specific params nulled
        // If FX is ON, we respect the slider value.

        let targetVal = val;

        // Define null value for bypass logic
        // Most wet controls: 0
        // Distortion: 0
        // Filter Freq: Max (20000) or Min? Master LPF usually cuts highs, so bypass = Max.
        // BitCrusher: 8 bits is default? 16 bits is clean. Lower bits = more fx. 
        //             Slider Min 1, Max 16. If bypass -> 16.

        if (!isGlobalFxActive) {
            if (fxType === 'filter') targetVal = 20000;
            else if (fxType === 'crush') targetVal = 16;
            else if (fxType === 'dist') targetVal = 0;
            else targetVal = 0; // Everything else (wet) -> 0
        }

        switch (fxType) {
            case 'delay': delay.wet.value = targetVal; break;
            case 'reverb': reverb.wet.value = targetVal; break;
            case 'crush':
                if (isGlobalFxActive) {
                    bitcrush.wet.value = 1;
                    bitcrush.bits.value = val;
                } else {
                    bitcrush.wet.value = 0;
                }
                break;
            case 'chorus': chorus.wet.value = targetVal; break;
            case 'dist':
                if (isGlobalFxActive) {
                    distortion.wet.value = 1;
                    distortion.distortion = val;
                } else {
                    distortion.wet.value = 0;
                }
                break;
            case 'filter': filter.frequency.value = targetVal; break;
            case 'phaser': phaser.wet.value = targetVal; break;
            case 'tremolo': tremolo.wet.value = targetVal; break;
            case 'pingpong': pingPong.wet.value = targetVal; break;
        }
    });
}

function setupControls() {
    const playBtn = document.getElementById('play-btn');
    const stopBtn = document.getElementById('stop-btn');
    const clearBtn = document.getElementById('clear-btn');
    const bpmKnob = document.getElementById('bpm-knob');
    const bpmDisplay = document.getElementById('bpm-display');
    const volKnob = document.getElementById('master-vol-knob');
    const volDisplay = document.getElementById('vol-display');

    // FX Master Toggle
    const fxToggle = document.getElementById('fx-global-toggle');
    fxToggle.addEventListener('click', () => {
        isGlobalFxActive = !isGlobalFxActive;
        fxToggle.textContent = isGlobalFxActive ? 'ON' : 'OFF';
        if (isGlobalFxActive) {
            fxToggle.classList.add('active');
        } else {
            fxToggle.classList.remove('active');
        }
        applyGlobalFx();
    });

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
            applyGlobalFx();
        });
    });
}

// Re-init logic to ensure clean state
// Re-init logic to ensure clean state
async function init() {
    await Tone.start();
    setupTracks();
    createUI();
    updateKeyboard();
    setupControls();
    Tone.Transport.scheduleRepeat((time) => { repeat(time); }, "16n");
    Tone.Transport.bpm.value = 120;
}

// init();
