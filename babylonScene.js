// Reference files, in order for intellisense to work with babylon functions and types
/// <reference path="babylon.d.ts" />
/// <reference path="babylon.gui.d.ts" />

"use strict"; // strict mode to guarantee better coding

// HTML elements (divs) for the render canvas, and for the fps counter
var canvas = document.getElementById("renderCanvas");
let divFps = document.getElementById("fps");

// Global variables for the base app
var meshes = []; // List of currently loaded meshes
var menuButton; // Menu button, needs to be global so that all buttons can enable it on click.
var buttonPanel; // Panel containing mesh buttons, global so that mesh buttons can add themselves to it
var activeMeshIndex; // Index (in meshes array) of most recently rendered mesh

// Global variables for the measurement tool
var lengthText, refLengthTextInput; // UI Elements
var measurementLine, referenceLine; // UI Lines
var refPoint1, refPoint2; // Reference line vertices
var measPoint1, measPoint2; // Measurement line vertices
var measurementVector, referenceVector; // Vectors for the measurement and reference
var startingPoint, startingTime; // When and where the current click on the mesh has started (null if no mouse button is held)
var measurementObserver; // Pointer observer for the measurement tool

// Enables the measurement tool on the current mesh
function enableMeasurements() {
	// Show the measurement UI
	lengthText.isVisible = true;
	refLengthTextInput.isVisible = true;

	// Just in case, mark mesh as pickable so that interactions work
	//meshes[activeMeshIndex].isPickable = true;

	// Tracks when and where the currently held click on the mesh has started
	startingPoint = null;
    startingTime = null;

	// If measurements are already enabled, do nothing
	if(measurementObserver) return;

	// Pointer events to place the measurement points and calculate the length
	measurementObserver = scene.onPointerObservable.add((pointerInfo) => {
		switch(pointerInfo.type) {
			// When click starts, record the time and position of the click
			case BABYLON.PointerEventTypes.POINTERDOWN:
				//var pickInfo = scene.pick(scene.pointerX, scene.pointerY);
				startingPoint = {x: pointerInfo.event.x, y: pointerInfo.event.y};
        		startingTime = Date.now();
				break;
			// When click stops, test if it's valid (short stationary click on a mesh), if so, move the relevant point to the clicked point on the mesh
			case BABYLON.PointerEventTypes.POINTERUP:
				// Click is ignored if held for over 150ms
				if(Date.now() - startingTime > 150) return;

				// Click is ignored if the mouse moved during the hold
				if(pointerInfo.event.x != startingPoint.x || pointerInfo.event.y != startingPoint.y) return;

				let pickInfo = pointerInfo.pickInfo;

				// debug
				//if (pickInfo.hit && !pickInfo.pickedPoint) {
				//	console.warn("Hit detected, but no point. Mesh:", pointerInfo.pickInfo.pickedMesh);
				//}

				// Click is ignored if not on a mesh
				if(!pickInfo.hit || !pickInfo.pickedPoint) return;

				// The point to move depends on the button that was clicked
				switch(pointerInfo.event.button) {
					case 0: // LEFT CLICK
						// Ctrl+Click moves a reference point, otherwise it's a measurement point
						if(pointerInfo.event.ctrlKey) {
							// Show reference point, and the line if both points are active
							refPoint1.isVisible = true;
							if(refPoint2.isVisible) referenceLine.isVisible = true;

							// Move reference point to clicked spot on the mesh
							refPoint1.position.x = pickInfo.pickedPoint.x;
							refPoint1.position.y = pickInfo.pickedPoint.y;
							refPoint1.position.z = pickInfo.pickedPoint.z; 
						} else {
							// Show measurement point, and the line if both points are active
							measPoint1.isVisible = true;
							if(measPoint2.isVisible) measurementLine.isVisible = true;

							// Move measurement point to clicked spot on the mesh
							measPoint1.position.x = pickInfo.pickedPoint.x;
							measPoint1.position.y = pickInfo.pickedPoint.y;
							measPoint1.position.z = pickInfo.pickedPoint.z;
						}
						break;
					case 2: // RIGHT CLICK
						// Ctrl+Click moves a reference point, otherwise it's a measurement point
						if(pointerInfo.event.ctrlKey) {
							// Show reference point, and the line if both points are active
							refPoint2.isVisible = true;
							if(refPoint1.isVisible) referenceLine.isVisible = true;

							// Move reference point to clicked spot on the mesh
							refPoint2.position.y = pickInfo.pickedPoint.y;
							refPoint2.position.z = pickInfo.pickedPoint.z; 
							refPoint2.position.x = pickInfo.pickedPoint.x;
						} else {
							// Show measurement point, and the line if both points are active
							measPoint2.isVisible = true;
							if(measPoint1.isVisible) measurementLine.isVisible = true;

							// Move measurement point to clicked spot on the mesh
							measPoint2.position.x = pickInfo.pickedPoint.x;
							measPoint2.position.y = pickInfo.pickedPoint.y;
							measPoint2.position.z = pickInfo.pickedPoint.z;
						}
						break;
				}

				// Compute the real-world length of the measurement line using its local length, and the information about the reference line
				measurementVector = measPoint2.position.subtract(measPoint1.position);
				referenceVector = refPoint2.position.subtract(refPoint1.position);
				lengthText.text = measurementVector.length() * refLengthTextInput.text / referenceVector.length();
				break;
		}
	});
}

// Disables the measurement tool for the current mesh, if any
function disableMeasurements() {
	// If an observer has been defined, remove it
	if(measurementObserver) {
		scene.onPointerObservable.remove(measurementObserver);
		measurementObserver = null;
	}

	// hide measurement objects
	refPoint1.isVisible = false;
	refPoint2.isVisible = false;
	measPoint1.isVisible = false;
	measPoint2.isVisible = false;
	referenceLine.isVisible = false;
	measurementLine.isVisible = false;
	refLengthTextInput.isVisible = false;
	lengthText.isVisible = false;
}

// This function takes a name and a file, and creates a button in the menu with "name" as text
// that loads and displays the mesh pointed by "meshSource", which can be a filepath or URL.
function createMeshButton(name, meshSource, meshOperations) {
	// Allocates a space in the array to store the mesh in, once it's loaded (after button click)
	let index = meshes.length;
	meshes.push(null);

	// Mesh button configuration
	var button = BABYLON.GUI.Button.CreateSimpleButton("load" + name, name);
	button.width = "250px";
	button.height = "100px";
	button.fontSize = "23px";
	button.background = "red";
	button.color = "darkred"; // text and border color
	button.cornerRadius = 3; // rounds the corner of the rectangle by 3px
	button.thickness = 3; // thickness of the border
	button.paddingBottom = "5px"; // adds spacing between buttons in the panel

	// On Click behaviour
	button.onPointerUpObservable.add(() => {
		// hides the menu buttons and sets activeMeshIndex
		buttonPanel.isVisible = false;
		activeMeshIndex = index;

		if(meshes[index] != null) {
			// If mesh is already loaded, reenable it and show "Back to Menu" button
			meshes[index].setEnabled(true);
			menuButton.isVisible = true;

			// Activate measurement tool
			enableMeasurements();
		} else {
			// If mesh isn't loaded, load it.
			// Load time is measured by console.time() and timeEnd()
			// The BabylonJS loading UI is shown during load (it can and will be configured)
			
			// Start timing and show load screen
			console.time("Loading " + name);
			console.log("Start loading of " + name);
			engine.displayLoadingUI();
			
			// Load the actual mesh asynchronously (returns a Promise)
			BABYLON.ImportMeshAsync(meshSource, scene).then(function (result) {
				// After load succeeds, put the mesh reference in the correct slot of the array
				if(result.meshes[0].name === "__root__" && result.meshes[0].getChildMeshes().length === 1) {
					// Meshes from .glb files have an empty __root__ mesh as parent, with the actual mesh as a child
					/*if(result.meshes[0].getChildMeshes().length !== 1) {
						// If there's multiple children, some things will break
						console.log("Unexpected mesh hierarchy, did not load mesh");
						return;
					}*/

					// Save the child (real mesh), not __root__
					meshes[index] = result.meshes[0].getChildMeshes()[0];
				} else {
					// If it's not a .glb, just take the mesh
					meshes[index] = result.meshes[0];
				}

				if(typeof meshOperations !== "undefined") meshOperations(meshes[index]); // Apply given operations to mesh, if any
				console.timeEnd("Loading " + name); // Stop timing (that also logs the time)
				engine.hideLoadingUI(); // hide the load screen
				menuButton.isVisible = true; // show menu button (after load only, or you can click it through the load screen which breaks everything)

				// Mesh subdivision and octree creation to optimize picking
				// Has to be done after the mesh operations !
				if(meshes[index].getChildMeshes().length > 0) {
					// Create a maximum of 1000 total submeshes uniformly split between the children
					let nbSub = 1000 / meshes[index].getChildMeshes().length;
					console.log(nbSub);
					meshes[index].getChildMeshes().forEach(child => {
						child.subdivide(Math.floor(nbSub));
						child.createOrUpdateSubmeshesOctree(64);
					});
				} else {
					// If no children, subdivide the mesh itself
					meshes[index].subdivide(1000);
					meshes[index].createOrUpdateSubmeshesOctree(64);
				}
				
				// Activate measurement tool
				enableMeasurements();
			});
		}
	});

	// Add the button to UI, return it so that its properties can be changed if needed
	buttonPanel.addControl(button);
	return button;
}

var createScene = function () {
	// Creation of the scene
    var scene = new BABYLON.Scene(engine);

	// Arc Rotate Camera, which can be panned, zoomed and rotated
	var camera = new BABYLON.ArcRotateCamera("camera",
											BABYLON.Tools.ToRadians(90), // starts at longitudinal angle 90
											BABYLON.Tools.ToRadians(90), // starts at latitudinal angle 90
											12, // starts at a distance of 12 units
											BABYLON.Vector3.Zero(), // initial pivot is the origin
											scene);
		//camera.wheelDeltaPercentage = 0.02; // slows down zooming. Has issues. wheelPrecision is better.
		camera.wheelPrecision = 50; // slows down the zooming (mouse wheel) by a factor of 50
		camera.attachControl(canvas, true);

	// Basic light source, shining down
    var light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 1, 0), scene);
    
	// Objects for the measurement tool //

	const sphereMat = new BABYLON.StandardMaterial("Sphere Material", scene);
    sphereMat.diffuseColor = BABYLON.Color3.Red();

    const refMat = new BABYLON.StandardMaterial("Reference Material", scene);
    refMat.diffuseColor = BABYLON.Color3.Purple();

    measPoint1 = BABYLON.MeshBuilder.CreateSphere("measPoint1", {diameter: 0.05}, scene);
    measPoint1.material = sphereMat;
	measPoint1.isPickable = false;

    measPoint2 = BABYLON.MeshBuilder.CreateSphere("measPoint2", {diameter: 0.05}, scene);
    measPoint2.material = sphereMat;
	measPoint2.isPickable = false;

    refPoint1 = BABYLON.MeshBuilder.CreateSphere("refPoint1", {diameter: 0.05}, scene);
    refPoint1.material = refMat;
	refPoint1.isPickable = false;

    refPoint2 = BABYLON.MeshBuilder.CreateSphere("refPoint2", {diameter: 0.05}, scene);
    refPoint2.material = refMat;
	refPoint2.isPickable = false;

	// Import mesh from an online source
	// Target website must implement CORS so that it can serve a file to another domain
	// BABYLON.ImportMeshAsync("https://babylontest.netlify.app/fountain.glb", scene).then(function (result) {
    //     // Resize and move mesh after import
		   //result.meshes[0].scaling = new BABYLON.Vector3(2,2,2);
	//     //result.meshes[0].position = new BABYLON.Vector3(0.5,-1.5,2);
    // });

	// UI Base (all UI elements are children of this)
	var advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

	// Create image-only button
	const tapeButton = BABYLON.GUI.Button.CreateImageOnlyButton("tapeBtn", "measure-tape.png");
	tapeButton.width = "64px";
	tapeButton.height = "64px";
	tapeButton.thickness = 0; // No border
	tapeButton.background = ""; // No background

	// Optional: set alignment (e.g. bottom-left corner)
	tapeButton.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
	tapeButton.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
	tapeButton.left = "20px";
	tapeButton.top = "-20px";

	tapeButton.image.stretch = BABYLON.GUI.Image.STRETCH_UNIFORM;
	tapeButton.image.autoScale = false;

	// On click, activate tool
	tapeButton.onPointerClickObservable.add(() => {
		enableMeasurements(); // Replace with your actual function
	});

	// Add to GUI
	advancedTexture.addControl(tapeButton);

	// Creation of a Stack Panel to store the buttons for each mesh
	buttonPanel = new BABYLON.GUI.StackPanel("Button Container");
	advancedTexture.addControl(buttonPanel); // add to UI

	// Creation of the buttons for each fountain mesh
	//createMeshButton("Fountain", "./fountain.glb");
	//createMeshButton("Fountain Light", "./fountainLight.glb");
	//createMeshButton("Fountain Downscaled", "./fountainDownscaled.glb");
	createMeshButton("Morosini Fountain", "./fountainLightDownscaled.glb");
	createMeshButton("Karydaki", "./Re-karydaki.glb");
	//createMeshButton("Monstree GS Original", "./monstree.ply");
	//createMeshButton("Monstree GS Clean", "./monstree_cleaned.ply");
	//createMeshButton("Monstree GS Compressed", "./monstree_cleaned_compressed.ply");
	//createMeshButton("Monstree GS .splat", "./monstree.splat");

	// For Monstree, move the mesh after load, because it is not centered
	createMeshButton("Monstree", "./monstree.glb", (mesh) => {
		mesh.position = new BABYLON.Vector3(0.5,-1.5,2);
	});

	// Menu button configuration
	menuButton = BABYLON.GUI.Button.CreateSimpleButton("Menu Button", "Back to Menu");
	menuButton.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
	menuButton.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
	menuButton.left = "-20px";
	menuButton.top = "-20px";
	menuButton.width = "150px";
	menuButton.height = "50px";
	menuButton.background = "red";
	menuButton.color = "darkred";
	menuButton.cornerRadius = 3;
	menuButton.thickness = 3;

	// On Click behaviour for the menu button
	menuButton.onPointerUpObservable.add(() => {
		// Make menu visible and hide menu button
		buttonPanel.isVisible = true;
		menuButton.isVisible = false;

		// Disable measurement tool
		disableMeasurements();

		// Disable current mesh (makes it invisible and improves performance)
		meshes[activeMeshIndex].setEnabled(false);
	});

	// Add menu button to the UI and make it invisible
	advancedTexture.addControl(menuButton);
	menuButton.isVisible = false;

	// Measurement tool //

	// Measurement line, its length (converted to real-world units) is shown
	measurementLine = new BABYLON.GUI.MultiLine("Measurement Line");
    measurementLine.add(measPoint1, measPoint2);
    measurementLine.color = "red";
    advancedTexture.addControl(measurementLine);

	// Reference line, basis for the conversion of mesh units into real-world units
    referenceLine = new BABYLON.GUI.MultiLine("Reference Line");
    referenceLine.add(refPoint1, refPoint2);
    referenceLine.color = "purple";
    advancedTexture.addControl(referenceLine);

	// Text Block showing the result of the measurement. Fixed in the top-right corner.
    lengthText = new BABYLON.GUI.TextBlock("Length Text");
    lengthText.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    lengthText.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
    lengthText.resizeToFit = true;
    lengthText.outlineColor = "white";
    lengthText.outlineWidth = 2;
    lengthText.left = "-20px";
    lengthText.top = "40px";
    advancedTexture.addControl(lengthText);

	// Text Field where the user has to enter the real-world length of the reference line. Fixed in the top-left corner.
    refLengthTextInput = new BABYLON.GUI.InputText("Reference Length Text Input");
    refLengthTextInput.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    refLengthTextInput.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    refLengthTextInput.left = "20px";
    refLengthTextInput.top = "20px";
    refLengthTextInput.width = "160px";
    refLengthTextInput.height = "60px";
    refLengthTextInput.background = "white";
    refLengthTextInput.focusedBackground = "white";
    refLengthTextInput.color = "black";
    advancedTexture.addControl(refLengthTextInput);

	// Updates length text when the reference length has been changed
	refLengthTextInput.onTextChangedObservable.add((_eventData, _eventState) => {
		measurementVector = measPoint2.position.subtract(measPoint1.position);
        referenceVector = refPoint2.position.subtract(refPoint1.position);
        lengthText.text = measurementVector.length() * refLengthTextInput.text / referenceVector.length();
	});

	// Measurements are disabled by default since there's no mesh
	disableMeasurements();

	// Allows access to the debug mode of BabylonJS, including an inspector.
	// Convenient for debugging.
	scene.debugLayer.show();

	// Change of performance settings in Babylon. May or may not have an impact on FPS.
	// Stops automatically clearing the canvas after each draw, ruining the visual aspect
	// scene.performancePriority = BABYLON.ScenePerformancePriority.Intermediate;
	

    return scene;
};

// Creation of the Babylon Engine and the scene
var engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
var scene = createScene();

// Definition of the render loop
engine.runRenderLoop(function () {
	// If the scene has been created
	if (scene) {
		scene.render(); // Render the frame in the scene
		divFps.innerHTML = engine.getFps().toFixed() + " FPS"; // Update the FPS counter
	}
});

// Resize when necessary
window.addEventListener("resize", function () {
	engine.resize();
});
