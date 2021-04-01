import CBuffer from "../_snowpack/pkg/CBuffer.js";
const yAxisWidth = 50;
const xAxisHeight = 80;
const axisColor = "#eee";
const axisFont = "sans-serif";
const axisFontSizePx = 14;
const tickFontSizePx = 10;
function createSpectrogram(stream) {
  let canvas = document.getElementById("spectrogram-canvas");
  canvas.width = Math.round(canvas.parentElement.clientWidth);
  canvas.height = Math.round(canvas.parentElement.clientHeight);
  let audioContext = new AudioContext();
  let source = audioContext.createMediaStreamSource(stream);
  let analyser = audioContext.createAnalyser();
  analyser.smoothingTimeConstant = 0;
  source.connect(analyser);
  const plotHeight = canvas.height - xAxisHeight;
  const log2pixels = Math.floor(Math.log2(plotHeight));
  analyser.fftSize = Math.min(Math.max(2 ** (log2pixels + 1), 16), 1024);
  console.log(`Using FFT size of ${analyser.fftSize}`);
  const targetPixelsPerTimestep = 5;
  const plotWidth = canvas.width - yAxisWidth;
  const numTimesteps = Math.min(Math.round(plotWidth / targetPixelsPerTimestep), 128);
  const timeStepMilliSecond = 10;
  const redrawInterval = 3;
  let timeStamps = new CBuffer(numTimesteps);
  let audioFreqPowerHistory = new CBuffer(numTimesteps);
  const now = new Date();
  for (let i = 0; i < numTimesteps; i++) {
    timeStamps.push(new Date(now.getTime() - i * timeStepMilliSecond));
    audioFreqPowerHistory.push(new Uint8Array(analyser.frequencyBinCount));
  }
  drawYAxis(canvas, audioContext.sampleRate);
  let redrawCounter = redrawInterval;
  function run() {
    timeStamps.unshift(new Date());
    audioFreqPowerHistory.rotateRight();
    analyser.getByteFrequencyData(audioFreqPowerHistory.first());
    if (redrawCounter == redrawInterval) {
      drawSpectogram(canvas, audioFreqPowerHistory, timeStamps);
      redrawCounter = 0;
    }
    redrawCounter++;
  }
  let timerId = setInterval(run, timeStepMilliSecond);
  let startStopButton = document.getElementById("start-stop");
  startStopButton.onclick = () => {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
      startStopButton.innerHTML = "Resume";
    } else {
      redrawCounter = redrawInterval;
      timerId = setInterval(run, timeStepMilliSecond);
      startStopButton.innerHTML = "Pause";
    }
  };
}
function drawYAxis(canvas, sampleRate) {
  let canvasCtx = canvas.getContext("2d");
  canvasCtx.fillStyle = axisColor;
  canvasCtx.strokeStyle = axisColor;
  const plotHeight = canvas.height - xAxisHeight;
  canvasCtx.save();
  canvasCtx.translate(10, canvas.height / 2);
  canvasCtx.rotate(-Math.PI / 2);
  canvasCtx.textAlign = "center";
  canvasCtx.font = `${axisFontSizePx}px ${axisFont}`;
  canvasCtx.fillText("Frequency [kHz]", 0, 0);
  canvasCtx.restore();
  const nyquistFreq = sampleRate / 2;
  const pixelPerHertz = plotHeight / nyquistFreq;
  const tickSpacingHertz = 2e3;
  const tickFreqs = [...Array(Math.floor(nyquistFreq / tickSpacingHertz) + 1).keys()].map((x) => tickSpacingHertz * x);
  canvasCtx.save();
  canvasCtx.textAlign = "right";
  canvasCtx.font = `${tickFontSizePx}px ${axisFont}`;
  const tickLength = 10;
  for (const f of tickFreqs) {
    const y = plotHeight - f * pixelPerHertz;
    canvasCtx.moveTo(yAxisWidth, y);
    canvasCtx.lineTo(yAxisWidth - tickLength, y);
    canvasCtx.stroke();
    canvasCtx.fillText(`${Math.round(f / 1e3)}`, yAxisWidth - tickLength - 5, y);
  }
}
function padLeading(n, width, z) {
  z = z || "0";
  const nStr = n.toString();
  return nStr.length >= width ? nStr : new Array(width - nStr.length + 1).join(z) + nStr;
}
function drawSpectogram(canvas, audioFreqPowerHistory, timeStamps) {
  let canvasCtx = canvas.getContext("2d");
  const plotWidth = canvas.width - yAxisWidth;
  const plotHeight = canvas.height - xAxisHeight;
  canvasCtx.beginPath();
  canvasCtx.clearRect(yAxisWidth, 0, plotWidth, plotHeight);
  canvasCtx.fillStyle = "rgb(0,0,0)";
  canvasCtx.fillRect(yAxisWidth, 0, plotWidth, plotHeight);
  const timeNumBins = audioFreqPowerHistory.length;
  const freqNumBins = audioFreqPowerHistory.first().length;
  const dx = plotWidth / timeNumBins;
  const dy = plotHeight / freqNumBins;
  let x = canvas.width - dx;
  let y;
  for (let timeIndex = 0; timeIndex < timeNumBins; timeIndex++) {
    const audioFreqPower = audioFreqPowerHistory.get(timeIndex);
    y = plotHeight - dy;
    for (let freqIndex = 0; freqIndex < freqNumBins; freqIndex++) {
      canvasCtx.fillStyle = `rgb(${audioFreqPower[freqIndex]},0,0)`;
      canvasCtx.fillRect(x, y, Math.ceil(dx), Math.ceil(dy));
      y -= dy;
    }
    x -= dx;
  }
  canvasCtx.clearRect(0, plotHeight, canvas.width, xAxisHeight);
  canvasCtx.fillStyle = axisColor;
  canvasCtx.strokeStyle = axisColor;
  canvasCtx.textAlign = "center";
  canvasCtx.font = `${axisFontSizePx}px ${axisFont}`;
  canvasCtx.fillText("Time [min:sec]", canvas.width / 2, canvas.height - 10);
  canvasCtx.font = `${tickFontSizePx}px ${axisFont}`;
  const tickLength = 10;
  const tickInterval = 10;
  for (let timeIndex = tickInterval; timeIndex < timeNumBins; timeIndex += tickInterval) {
    x = canvas.width - dx / 2 - timeIndex * dx;
    canvasCtx.save();
    canvasCtx.translate(x, plotHeight);
    canvasCtx.moveTo(0, 0);
    canvasCtx.lineTo(0, tickLength);
    canvasCtx.stroke();
    canvasCtx.textAlign = "right";
    canvasCtx.rotate(-Math.PI / 4);
    const t = timeStamps.get(timeIndex);
    canvasCtx.fillText(`${padLeading(t.getMinutes(), 2)}:${padLeading(t.getSeconds(), 2)}.${padLeading(t.getMilliseconds(), 3)}`, -5, tickLength + 10);
    canvasCtx.restore();
  }
}
window.onload = function() {
  let constraints = {audio: true};
  navigator.mediaDevices.getUserMedia(constraints).then((stream) => createSpectrogram(stream));
};
