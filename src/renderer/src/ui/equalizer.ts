export type EQBand = {
  frequency: number;
  label: string;
  node?: BiquadFilterNode;
  slider?: HTMLInputElement;
};

export class Equalizer {
  public bands: EQBand[];
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.container.classList.add("equalizer");

    this.bands = [
      { frequency: 60, label: "Bass" },
      { frequency: 250, label: "Low Mid" },
      { frequency: 1000, label: "Mid" },
      { frequency: 4000, label: "High Mid" },
      { frequency: 16000, label: "Treble" }
    ];

    this.renderUI();
  }

  private renderUI() {
    this.container.innerHTML = "";

    this.bands.forEach((band) => {
      const wrapper = document.createElement("div");
      wrapper.className = "eq-band";

      const label = document.createElement("label");
      label.className = "eq-label";
      label.textContent = band.label;

      const slider = document.createElement("input");
      slider.className = "eq-slider";
      slider.type = "range";
      slider.min = "-12";
      slider.max = "12";
      slider.step = "0.1";
      slider.value = "0";
      band.slider = slider;

      slider.addEventListener("input", () => {
        if (band.node) {
          band.node.gain.value = parseFloat(slider.value);
        }
      });

      const freqLabel = document.createElement("span");
      freqLabel.className = "eq-freq-label";
      freqLabel.textContent = `${band.frequency} Hz`;

      wrapper.appendChild(label);
      wrapper.appendChild(slider);
      wrapper.appendChild(freqLabel);

      this.container.appendChild(wrapper);
    });
  }
}