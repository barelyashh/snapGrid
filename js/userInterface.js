class UserInterface {
    constructor(viewer) {
        this.completeViewer = viewer;
        this.createUI();
        this.createDimensionBox();
    }

    createUI() {
        this.createHeader();
        this.createSidebar();
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

        const overallDefaults = { Width: 250, Height: 200, Depth: 20 };
        const rectangleDefaults = { Width: 10, Height: 100, Depth: 10 };

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

        sidebar.appendChild(this.createButton('Toggle Transform Control', 'toggle-btn', () => this.completeViewer.bodies.toggleTransformMode()));
        sidebar.appendChild(this.createButton('Switch mode', 'toggle-btn-2d', () => this.completeViewer.switchMode()));
        sidebar.appendChild(this.createButton('Switch Snap', 'toggle-btn-2d', () => this.completeViewer.bodies.switchSnap()));

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

        if (!width || !height || width < 100 || width > 2000 || height < 100 || height > 2000 || depth < 0 || depth > 50) {
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

        if (!widthBox || !heightBox || !depthBox || widthBox >= this.completeViewer.overallWidth || heightBox >= this.completeViewer.overallHeight || depthBox > this.completeViewer.overallDepth) {
            alert('Rectangle dimensions must be less than overall dimensions');
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

}

export { UserInterface };
