class UserInterface {
    constructor(viewer) {
        this.completeViewer = viewer;
        this.createUI();
        this.createDimensionBox();
    }

    createUI() {
        this.createHeader();
        this.createSidebar();
        this.createSnapWarningBox();
    }

    createHeader() {
        const header = document.createElement('header');
        header.innerHTML = `
            <div class="logo">CONFIGURAT<span class="gear">⚙️</span>R</div>
        `;
        document.body.appendChild(header);
    }

    createSidebar() {
        const sideBarContainer = document.getElementById('sideBarContainer') || document.createElement('div');
        sideBarContainer.id = 'sideBarContainer';
        document.body.appendChild(sideBarContainer);

        const sidebar = document.createElement('aside');
        sidebar.className = 'sidebar';

        /*    const overallDefaults = { Width: 500, Height: 750, Depth: 500 };
           const rectangleDefaults = { Width: 19, Height: 500, Depth: 500 }; */
        const overallDefaults = { Width: 3000, Height: 2200, Depth: 300 };
        const rectangleDefaults = { Width: 200, Height: 2200, Depth: 200 };

        const overallPanel = this.createPanel('OVERALL DIMENSIONS', ['Width', 'Height', 'Depth'], (inputs) => {
            this.handleOverallDimensions(inputs);
        }, overallDefaults);
        sidebar.appendChild(overallPanel);

        const rectanglePanel = this.createPanel('ADD RECTANGLE', ['Width', 'Height', 'Depth'], (inputs) => {
            this.handleRectangleAddition(inputs);
        }, rectangleDefaults);
        sidebar.appendChild(rectanglePanel);

        setTimeout(() => {
            overallPanel.querySelector('.add-btn').click();
            setTimeout(() => rectanglePanel.querySelector('.add-btn').click(), 200);
        }, 200);

        //Switch Mode
        sidebar.appendChild(this.createButton('Switch mode', 'toggle-btn-2d', () => this.completeViewer.switchMode()));

        //Switch Snap (only in 2D mode)
        const snapButton = this.createButton('Switch Snap', 'toggle-btn-2d', () => this.completeViewer.bodies.switchSnap());

        //Transform Control (only in 3D mode)
        const transformControlContainer = document.createElement('div');
        transformControlContainer.className = 'transform-control-container';

        const toggleSwitch = document.createElement('label');
        toggleSwitch.className = 'toggle-switch';

        const toggleInput = document.createElement('input');
        toggleInput.type = 'checkbox';

        const toggleSlider = document.createElement('span');
        toggleSlider.className = 'toggle-slider';

        const toggleLabel = document.createElement('span');
        toggleLabel.className = 'toggle-label';
        toggleLabel.textContent = 'Toggle Access Point';

        toggleInput.addEventListener('change', () => {
            this.completeViewer.bodies.toggleTransformMode();
        });

        toggleSwitch.appendChild(toggleInput);
        toggleSwitch.appendChild(toggleSlider);
        transformControlContainer.appendChild(toggleSwitch);
        transformControlContainer.appendChild(toggleLabel);
        sidebar.appendChild(transformControlContainer);
        sidebar.appendChild(snapButton);
        sideBarContainer.appendChild(sidebar);
    }

    createPanel(title, fields, onAdd, defaultValues = {}) {
        const panel = document.createElement('div');
        panel.className = 'panel';
        panel.innerHTML = `<div class="panel-header">${title}</div>`;

        const panelBody = document.createElement('div');
        panelBody.className = 'panel-body';

        const inputs = {};
        fields.forEach(field => {
            const label = document.createElement('label');
            label.innerText = field;

            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = 'in mm';
            input.value = defaultValues[field] || '';
            inputs[field] = input;

            label.appendChild(input);
            panelBody.appendChild(label);
        });

        const button = this.createButton('ADD', 'add-btn', () => onAdd(inputs));
        panelBody.appendChild(button);

        panel.appendChild(panelBody);
        return panel;
    }

    createButton(text, className, onClick) {
        const button = document.createElement('button');
        button.className = className;
        button.innerText = text;
        button.onclick = onClick;
        return button;
    }

    handleOverallDimensions(inputs) {
        const width = Number(inputs.Width.value.trim());
        const height = Number(inputs.Height.value.trim());
        const depth = Number(inputs.Depth.value.trim());

        if (!width || !height || width < 100 || width > 3500 || height < 100 || height > 3500 || depth < 0 || depth > 3500) {
            alert('Enter valid dimensions (100-2000mm for width/height, 0-50mm for depth)');
            return;
        }

        this.completeViewer.overallWidth = width;
        this.completeViewer.overallHeight = height;
        this.completeViewer.overallDepth = depth;
        this.completeViewer.bodies.addOverallDimension(width, height, depth);
    }

    handleRectangleAddition(inputs) {
        const widthBox = Number(inputs.Width.value.trim());
        const heightBox = Number(inputs.Height.value.trim());
        const depthBox = Number(inputs.Depth.value.trim());

        if (!this.completeViewer.overallWidth || !this.completeViewer.overallHeight) {
            alert('First add overall dimension');
            return;
        }

        if (!widthBox || !heightBox || !depthBox || widthBox > this.completeViewer.overallWidth || heightBox > this.completeViewer.overallHeight || depthBox > this.completeViewer.overallDepth) {
            alert('Rectangle dimensions must be less than or equals to overall dimensions');
            return;
        }

        this.completeViewer.bodies.addRectangle({ widthBox, heightBox, depthBox });
    }

    createDimensionBox() {
        // Check if the dimension box already exists
        let dimensionBox = document.getElementById("dimension-box");
        if (!dimensionBox) {
            dimensionBox = document.createElement("div");
            dimensionBox.id = "dimension-box";
            document.body.appendChild(dimensionBox);
        }
    }

    createSnapWarningBox() {
        const warningBox = document.createElement("div");
        warningBox.id = "snap-warning";
        warningBox.style.cssText = `
            position: absolute;
            top: 60px;
            left: 50%;
            transform: translateX(-50%);
            padding: 10px 20px;
            background-color: rgba(255, 100, 100, 0.9);
            color: white;
            font-family: sans-serif;
            font-size: 14px;
            border-radius: 8px;
            display: none;
            z-index: 10;
            pointer-events: none;
        `;
        document.body.appendChild(warningBox);
    }

}

export { UserInterface };
