function createNutritionChart() {
    const margin = {top: 20, right: 20, bottom: 30, left: 60};
    const width = document.getElementById('nutrition-chart').clientWidth - margin.left - margin.right;
    const height = document.getElementById('nutrition-chart').clientHeight - margin.top - margin.bottom;

    // Clear existing SVG
    d3.select("#nutrition-chart").select("svg").remove();

    const svg = d3.select("#nutrition-chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    fetch('/dashboard/api/nutrition')
        .then(response => response.json())
        .then(data => {
            // Process data - ensure all values are non-negative
            const nutritionData = Object.entries(data).map(([day, values]) => ({
                day: day,
                carbs: Math.max(0, values.carbs || 0),    // Handle null/undefined
                protein: Math.max(0, values.protein || 0), // Handle null/undefined
                fat: Math.max(0, values.fat || 0)         // Handle null/undefined
            }));

            // Stack the data
            const stack = d3.stack()
                .keys(['carbs', 'protein', 'fat'])
                .order(d3.stackOrderNone)
                .offset(d3.stackOffsetNone);

            const stackedData = stack(nutritionData);

            // X axis
            const x = d3.scaleBand()
                .range([0, width])
                .domain(nutritionData.map(d => d.day))
                .padding(0.2);

            // Y axis - ensure domain starts at 0
            const y = d3.scaleLinear()
                .domain([0, d3.max(stackedData[stackedData.length - 1], d => d[1]) * 1.1])
                .range([height, 0]);

            // Color scale
            const color = d3.scaleOrdinal()
                .domain(['carbs', 'protein', 'fat'])
                .range(['#e41a1c', '#377eb8', '#4daf4a']);

            // Add bars with error handling
            svg.append("g")
                .selectAll("g")
                .data(stackedData)
                .join("g")
                .attr("fill", d => color(d.key))
                .selectAll("rect")
                .data(d => d)
                .join("rect")
                .attr("x", d => x(d.data.day))
                .attr("y", d => {
                    const yValue = y(d[1]);
                    return isNaN(yValue) || yValue < 0 ? height : yValue;
                })
                .attr("height", d => {
                    const h = y(d[0]) - y(d[1]);
                    return isNaN(h) || h < 0 ? 0 : h;
                })
                .attr("width", x.bandwidth());

            // Add axes
            svg.append("g")
                .attr("transform", `translate(0,${height})`)
                .call(d3.axisBottom(x));

            svg.append("g")
                .call(d3.axisLeft(y));

            // Add legend
            const legend = svg.append("g")
                .attr("font-family", "sans-serif")
                .attr("font-size", 10)
                .attr("text-anchor", "start")
                .selectAll("g")
                .data(['carbs', 'protein', 'fat'])
                .join("g")
                .attr("transform", (d, i) => `translate(0,${i * 20})`);

            legend.append("rect")
                .attr("x", width - 19)
                .attr("width", 19)
                .attr("height", 19)
                .attr("fill", color);

            legend.append("text")
                .attr("x", width - 24)
                .attr("y", 9.5)
                .attr("dy", "0.32em")
                .text(d => d);
        })
        .catch(error => {
            console.error('Error loading nutrition data:', error);
            // Add error logging to help debug
            console.log('Raw data received:', data);
            d3.select("#nutrition-chart")
                .append("p")
                .attr("class", "error-message")
                .text("Error loading nutrition data");
        });
}

// Initial creation
createNutritionChart();

// Redraw on window resize
window.addEventListener('resize', createNutritionChart); 