class SvgInline extends HTMLElement {
    constructor() {
        super();
        // create a shadow root
        this.attachShadow({ mode: 'open' });
        this.load();
    }
    async load() {
        let svgUrl = this.getAttribute("src");
        if (!svgUrl) return;
        let response = await fetch(svgUrl);
        let svgText = await response.text();
        this.shadowRoot.innerHTML = svgText;

        let svgElement = this.shadowRoot.querySelector("svg");
        svgElement.removeAttribute("width");
        svgElement.removeAttribute("height");
        svgElement.style.width = "100%";
        svgElement.style.height = "100%";
    }
}

customElements.define('svg-inline', SvgInline);