

import {} from "./pc-cluster-visual.js";
import {} from "./pc-basic.js"
import {} from "./ur5-scene.js"
import {} from "./ur5-episode.js"
import {} from "./svg-inline.js"

const main = document.getElementById('main');
    const slideElements = document.querySelectorAll('p-slide');
    const slides = [];
    let totalSlides = 0;
    for (const slideElement of slideElements) {
        let slideCount = parseInt(slideElement.getAttribute('slides')) || 1;
        let slide = {
            element: slideElement,
            count: slideCount,
            start: totalSlides
        };
        totalSlides += slideCount;
        for (let i = 0; i < slideCount; i++) {
            slides.push(slide);
        }

        slideElement.remove();
    }
    let currentSlideIndex = 0;
    
    function showSlide(index) {
        let slide = slides[index];
        let relIndex = index - slide.start;
        slide.element.style.setProperty('--slide-index', relIndex);
        slide.element.setAttribute('slide', relIndex+1);
        slide.element.setAttribute('slide-count', new Array(relIndex + 1).fill('x').join(''));
        slide.element.slide = relIndex
        main.innerHTML = '';
        main.appendChild(slide.element);
        let vids = slide.element.querySelectorAll('video');
        vids.forEach(v => v.play());
        window.localStorage.setItem('currentSlide', index);
    }

    currentSlideIndex = parseInt(window.localStorage.getItem('currentSlide')) || 0;
    showSlide(currentSlideIndex);

    window.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') {
            if (currentSlideIndex < totalSlides - 1) {
                currentSlideIndex++;
                showSlide(currentSlideIndex);
            }
        } else if (e.key === 'ArrowLeft') {
            if (currentSlideIndex > 0) {
                currentSlideIndex--;
                showSlide(currentSlideIndex);
            }
        }
    });