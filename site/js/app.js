// Quit button handler (if present in HTML)
const quitBtn = document.getElementById('quit-btn');
if (quitBtn) {
    quitBtn.addEventListener('click', () => {
        // Check if running in Wails
        if (window.runtime && window.runtime.Quit) {
            window.runtime.Quit();
        } else {
            // HTTP server mode
            fetch('/shutdown')
                .then(() => {
                    window.close();
                })
                .catch((err) => {
                    console.error('Shutdown error:', err);
                    alert('Please close the browser window manually');
                });
        }
    });
}

// Scrollama setup
const scroller = scrollama();

scroller
    .setup({
        step: '.step',
        offset: 0.5,
        debug: false
    })
    .onStepEnter((response) => {
        const { element, index, direction } = response;

        // Remove active class from all steps
        document.querySelectorAll('.step').forEach(step => {
            step.classList.remove('is-active');
        });

        // Add active class to current step
        element.classList.add('is-active');

        // Update graphic based on step
        updateGraphic(element);
    })
    .onStepExit((response) => {
        // Optional: handle step exit
    });

// D3 visualization functions
function createBarChart(svg, color) {
    const data = [
        { label: 'Q1', value: 45 },
        { label: 'Q2', value: 62 },
        { label: 'Q3', value: 78 },
        { label: 'Q4', value: 91 }
    ];

    const width = 400;
    const height = 250;
    const margin = { top: 20, right: 20, bottom: 40, left: 40 };

    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const x = d3.scaleBand()
        .domain(data.map(d => d.label))
        .range([margin.left, width - margin.right])
        .padding(0.2);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.value)])
        .nice()
        .range([height - margin.bottom, margin.top]);

    // Add bars
    svg.selectAll('rect')
        .data(data)
        .join('rect')
        .attr('x', d => x(d.label))
        .attr('y', height - margin.bottom)
        .attr('width', x.bandwidth())
        .attr('height', 0)
        .attr('fill', color.text)
        .attr('opacity', 0.8)
        .transition()
        .duration(800)
        .delay((d, i) => i * 100)
        .attr('y', d => y(d.value))
        .attr('height', d => y(0) - y(d.value));

    // Add x-axis
    svg.append('g')
        .attr('transform', `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x))
        .attr('color', color.text);

    // Add y-axis
    svg.append('g')
        .attr('transform', `translate(${margin.left},0)`)
        .call(d3.axisLeft(y))
        .attr('color', color.text);
}

function createLineGraph(svg, color) {
    const data = [
        { x: 0, y: 30 },
        { x: 1, y: 45 },
        { x: 2, y: 38 },
        { x: 3, y: 62 },
        { x: 4, y: 58 },
        { x: 5, y: 78 },
        { x: 6, y: 85 }
    ];

    const width = 400;
    const height = 250;
    const margin = { top: 20, right: 20, bottom: 40, left: 40 };

    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const x = d3.scaleLinear()
        .domain([0, data.length - 1])
        .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.y)])
        .nice()
        .range([height - margin.bottom, margin.top]);

    const line = d3.line()
        .x(d => x(d.x))
        .y(d => y(d.y))
        .curve(d3.curveMonotoneX);

    // Add the line path
    const path = svg.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', color.text)
        .attr('stroke-width', 3)
        .attr('d', line);

    // Animate the line drawing
    const pathLength = path.node().getTotalLength();
    path
        .attr('stroke-dasharray', pathLength)
        .attr('stroke-dashoffset', pathLength)
        .transition()
        .duration(2000)
        .ease(d3.easeLinear)
        .attr('stroke-dashoffset', 0);

    // Add dots
    svg.selectAll('circle')
        .data(data)
        .join('circle')
        .attr('cx', d => x(d.x))
        .attr('cy', d => y(d.y))
        .attr('r', 0)
        .attr('fill', color.text)
        .transition()
        .duration(300)
        .delay((d, i) => (i / data.length) * 2000)
        .attr('r', 4);

    // Add axes
    svg.append('g')
        .attr('transform', `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).ticks(6))
        .attr('color', color.text);

    svg.append('g')
        .attr('transform', `translate(${margin.left},0)`)
        .call(d3.axisLeft(y))
        .attr('color', color.text);
}

function createCircleAnimation(svg, color) {
    const width = 400;
    const height = 300;

    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const circles = [
        { cx: 100, cy: 150, r: 40, delay: 0 },
        { cx: 200, cy: 150, r: 60, delay: 200 },
        { cx: 300, cy: 150, r: 50, delay: 400 }
    ];

    svg.selectAll('circle')
        .data(circles)
        .join('circle')
        .attr('cx', d => d.cx)
        .attr('cy', d => d.cy)
        .attr('r', 0)
        .attr('fill', 'none')
        .attr('stroke', color.text)
        .attr('stroke-width', 3)
        .attr('opacity', 0.7)
        .transition()
        .duration(800)
        .delay(d => d.delay)
        .attr('r', d => d.r);
}

function createScatterPlot(svg, color) {
    const data = Array.from({ length: 30 }, () => ({
        x: Math.random() * 80 + 10,
        y: Math.random() * 80 + 10,
        r: Math.random() * 5 + 3
    }));

    const width = 400;
    const height = 250;
    const margin = { top: 20, right: 20, bottom: 40, left: 40 };

    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const x = d3.scaleLinear()
        .domain([0, 100])
        .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
        .domain([0, 100])
        .range([height - margin.bottom, margin.top]);

    // Add dots
    svg.selectAll('circle')
        .data(data)
        .join('circle')
        .attr('cx', d => x(d.x))
        .attr('cy', d => y(d.y))
        .attr('r', 0)
        .attr('fill', color.text)
        .attr('opacity', 0.6)
        .transition()
        .duration(600)
        .delay((d, i) => i * 30)
        .attr('r', d => d.r);

    // Add axes
    svg.append('g')
        .attr('transform', `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x))
        .attr('color', color.text);

    svg.append('g')
        .attr('transform', `translate(${margin.left},0)`)
        .call(d3.axisLeft(y))
        .attr('color', color.text);
}

function createDonutChart(svg, color) {
    const data = [30, 25, 20, 15, 10];
    const width = 300;
    const height = 200;
    const radius = Math.min(width, height) / 2 - 10;

    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg.append('g')
        .attr('transform', `translate(${width / 2},${height / 2})`);

    const colorScale = d3.scaleOrdinal()
        .range([color.text,
                d3.rgb(color.text).brighter(0.5),
                d3.rgb(color.text).brighter(1),
                d3.rgb(color.text).brighter(1.5),
                d3.rgb(color.text).brighter(2)]);

    const pie = d3.pie();
    const arc = d3.arc()
        .innerRadius(radius * 0.5)
        .outerRadius(radius);

    const arcs = g.selectAll('arc')
        .data(pie(data))
        .join('path')
        .attr('fill', (d, i) => colorScale(i))
        .attr('stroke', color.bg)
        .attr('stroke-width', 2)
        .attr('opacity', 0.8);

    arcs.transition()
        .duration(800)
        .delay((d, i) => i * 100)
        .attrTween('d', function(d) {
            const interpolate = d3.interpolate({startAngle: 0, endAngle: 0}, d);
            return function(t) {
                return arc(interpolate(t));
            };
        });
}

function createTreeMap(svg, color) {
    const data = {
        children: [
            { value: 100 },
            { value: 80 },
            { value: 60 },
            { value: 50 },
            { value: 40 },
            { value: 30 }
        ]
    };

    const width = 300;
    const height = 200;

    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const root = d3.hierarchy(data)
        .sum(d => d.value);

    d3.treemap()
        .size([width, height])
        .padding(2)(root);

    const colorScale = d3.scaleLinear()
        .domain([0, root.children.length - 1])
        .range([color.text, d3.rgb(color.text).darker(1)]);

    svg.selectAll('rect')
        .data(root.leaves())
        .join('rect')
        .attr('x', d => d.x0)
        .attr('y', d => d.y0)
        .attr('width', 0)
        .attr('height', 0)
        .attr('fill', (d, i) => colorScale(i))
        .attr('opacity', 0.8)
        .attr('stroke', color.bg)
        .attr('stroke-width', 2)
        .transition()
        .duration(800)
        .delay((d, i) => i * 100)
        .attr('width', d => d.x1 - d.x0)
        .attr('height', d => d.y1 - d.y0);
}

function showD3Grid(color) {
    const container = document.getElementById('graphic-d3grid');
    container.classList.add('active');

    createBarChart(d3.select('#d3-bar'), color);
    createDonutChart(d3.select('#d3-donut'), color);
    createTreeMap(d3.select('#d3-tree'), color);
    createLineGraph(d3.select('#d3-line'), color);
}

function showSVGLogos() {
    const container = document.getElementById('graphic-svglogos');
    const logos = [
        { path: 'images/apple-color-svgrepo-com.svg', anim: 'anim-fade' },
        { path: 'images/android-color-svgrepo-com.svg', anim: 'anim-slide' },
        { path: 'images/photoshop-color-svgrepo-com.svg', anim: 'anim-rotate' },
        { path: 'images/slack-color-svgrepo-com.svg', anim: 'anim-bounce' }
    ];

    container.innerHTML = '';
    container.classList.add('active');

    logos.forEach((logo, index) => {
        const img = document.createElement('img');
        img.src = logo.path;
        img.alt = 'Logo';
        img.classList.add(logo.anim);
        container.appendChild(img);

        console.log(`Logo ${index}: ${logo.anim} class added`);

        setTimeout(() => {
            img.classList.add('show');
            console.log(`Logo ${index}: show class added`);
        }, 300 + (index * 150));
    });
}

// Update graphic content based on current step
function updateGraphic(element) {
    const number = element.dataset.number;
    const title = element.dataset.title;
    const viz = element.dataset.viz;
    const image = element.dataset.image;

    const graphicNumber = document.getElementById('graphic-number');
    const graphicTitle = document.getElementById('graphic-title');
    const graphicSvg = document.getElementById('graphic-svg');
    const graphicImage = document.getElementById('graphic-image');
    const graphicSvgLogos = document.getElementById('graphic-svglogos');
    const graphicD3Grid = document.getElementById('graphic-d3grid');
    const graphicContent = document.querySelector('.graphic-content');
    const figure = document.querySelector('figure');

    // Update number and title
    graphicNumber.textContent = number;
    graphicTitle.textContent = title;

    // Color palette for each step
    const colors = [
        { bg: '#667eea', text: '#ffffff' },
        { bg: '#f093fb', text: '#ffffff' },
        { bg: '#4facfe', text: '#ffffff' },
        { bg: '#43e97b', text: '#ffffff' },
        { bg: '#fa709a', text: '#ffffff' },
        { bg: '#764ba2', text: '#ffffff' },
        { bg: '#f5576c', text: '#ffffff' },
        { bg: '#4fd1c5', text: '#ffffff' },
        { bg: '#ffd166', text: '#1a1a1a' }
    ];

    const step = parseInt(element.dataset.step);
    const colorIndex = (step - 1) % colors.length;
    const color = colors[colorIndex];

    // Reset all display modes
    graphicSvg.style.display = 'none';
    graphicImage.style.display = 'none';
    graphicImage.classList.remove('active');
    graphicSvgLogos.classList.remove('active');
    graphicD3Grid.classList.remove('active');

    // Handle images - use as background
    if (image) {
        graphicNumber.style.display = 'block';
        graphicTitle.style.marginTop = '0';
        figure.style.background = `url(${image}) center/cover`;
        graphicContent.classList.add('has-background');
        graphicNumber.style.color = '#ffffff';
        graphicTitle.style.color = '#ffffff';
    }
    // Handle visualizations
    else if (viz) {
        graphicContent.classList.remove('has-background');
        figure.style.background = color.bg;
        graphicNumber.style.color = color.text;
        graphicTitle.style.color = color.text;

        if (viz === 'svglogos') {
            graphicNumber.style.display = 'none';
            graphicTitle.style.marginTop = '0';
            showSVGLogos();
        } else if (viz === 'circles') {
            graphicNumber.style.display = 'block';
            graphicTitle.style.marginTop = '';
            graphicSvg.style.display = 'block';
            createCircleAnimation(d3.select('#graphic-svg'), color);
        } else if (viz === 'd3grid') {
            graphicNumber.style.display = 'none';
            graphicTitle.style.marginTop = '0';
            showD3Grid(color);
        } else {
            graphicNumber.style.display = 'none';
            graphicTitle.style.marginTop = '0';
            graphicSvg.style.display = 'block';

            switch(viz) {
                case 'bar':
                    createBarChart(d3.select('#graphic-svg'), color);
                    break;
                case 'line':
                    createLineGraph(d3.select('#graphic-svg'), color);
                    break;
                case 'scatter':
                    createScatterPlot(d3.select('#graphic-svg'), color);
                    break;
            }
        }
    }
    // Default: just show number
    else {
        graphicContent.classList.remove('has-background');
        figure.style.background = color.bg;
        graphicNumber.style.color = color.text;
        graphicTitle.style.color = color.text;
        graphicNumber.style.display = 'block';
        graphicTitle.style.marginTop = '';
    }
}

// Handle window resize
window.addEventListener('resize', scroller.resize);

// Request fullscreen on first user interaction
let fullscreenRequested = false;
document.addEventListener('click', () => {
    if (!fullscreenRequested && !document.fullscreenElement) {
        document.documentElement.requestFullscreen()
            .then(() => {
                fullscreenRequested = true;
                console.log('Entered fullscreen mode');
            })
            .catch((err) => {
                console.log('Fullscreen request denied:', err);
            });
    }
}, { once: true });
