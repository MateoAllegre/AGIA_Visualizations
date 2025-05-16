// Reference files, in order for intellisense to work with babylon functions and types
/// <reference path="babylon.d.ts" />
/// <reference path="babylon.gui.d.ts" />

"use strict"; // strict mode to guarantee better coding

import ConversionHelper from "./conversions.js";

// HTML elements (divs) for the render canvas, and for the fps counter
var canvas = document.getElementById("renderCanvas");
let divFps = document.getElementById("fps");

// Global variables for the base app
var meshes = []; // List of currently loaded meshes
var activeMeshIndex; // Index (in meshes array) of most recently rendered mesh

var menuButton; // Menu button, needs to be global so that all buttons can enable it on click.
var buttonPanel; // Panel containing mesh buttons, global so that mesh buttons can add themselves to it

// Global variables for the measurement tool
var mtGUI; // Measurement Tool GUI
var mtMeasurementLine, mtReferenceLine; // UI Lines
var mtRefPoint1, mtRefPoint2; // Reference line vertices
var mtMeasPoint1, mtMeasPoint2; // Measurement line vertices
var mtMeasurementObserver; // Pointer observer for the measurement tool
var mtButton; // Button to activate measurement tool
var mtRefInput, mtMeasText; // Input field and output text for the reference length and measurement length, respectively

// Enables the measurement tool on the current mesh
function enableMeasurements() {
	// Hide the button
	mtButton.isVisible = false;

	// Show the measurement UI
	mtGUI.isVisible = true;

	// Tracks when and where the currently held click on the mesh has started
	var startingPoint = null;
    var startingTime = null;

	// If measurements are already enabled, do nothing
	if(mtMeasurementObserver) return;

	// Pointer events to place the measurement points and calculate the length
	mtMeasurementObserver = scene.onPointerObservable.add((pointerInfo) => {
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

				// Click is ignored if not on a mesh
				if(!pointerInfo.pickInfo.hit || !pointerInfo.pickInfo.pickedPoint) return;

				// The point to move depends on the button that was clicked
				switch(pointerInfo.event.button) {
					case 0: // LEFT CLICK
						// Ctrl+Click moves a reference point, otherwise it's a measurement point
						if(pointerInfo.event.ctrlKey) {
							// Show reference point, and the line if both points are active
							mtRefPoint1.isVisible = true;
							if(mtRefPoint2.isVisible) mtReferenceLine.isVisible = true;

							// Move reference point to clicked spot on the mesh
							mtRefPoint1.position.x = pointerInfo.pickInfo.pickedPoint.x;
							mtRefPoint1.position.y = pointerInfo.pickInfo.pickedPoint.y;
							mtRefPoint1.position.z = pointerInfo.pickInfo.pickedPoint.z; 
						} else {
							// Show measurement point, and the line if both points are active
							mtMeasPoint1.isVisible = true;
							if(mtMeasPoint2.isVisible) mtMeasurementLine.isVisible = true;

							// Move measurement point to clicked spot on the mesh
							mtMeasPoint1.position.x = pointerInfo.pickInfo.pickedPoint.x;
							mtMeasPoint1.position.y = pointerInfo.pickInfo.pickedPoint.y;
							mtMeasPoint1.position.z = pointerInfo.pickInfo.pickedPoint.z;
						}
						break;
					case 2: // RIGHT CLICK
						// Ctrl+Click moves a reference point, otherwise it's a measurement point
						if(pointerInfo.event.ctrlKey) {
							// Show reference point, and the line if both points are active
							mtRefPoint2.isVisible = true;
							if(mtRefPoint1.isVisible) mtReferenceLine.isVisible = true;

							// Move reference point to clicked spot on the mesh
							mtRefPoint2.position.y = pointerInfo.pickInfo.pickedPoint.y;
							mtRefPoint2.position.z = pointerInfo.pickInfo.pickedPoint.z; 
							mtRefPoint2.position.x = pointerInfo.pickInfo.pickedPoint.x;
						} else {
							// Show measurement point, and the line if both points are active
							mtMeasPoint2.isVisible = true;
							if(mtMeasPoint1.isVisible) mtMeasurementLine.isVisible = true;

							// Move measurement point to clicked spot on the mesh
							mtMeasPoint2.position.x = pointerInfo.pickInfo.pickedPoint.x;
							mtMeasPoint2.position.y = pointerInfo.pickInfo.pickedPoint.y;
							mtMeasPoint2.position.z = pointerInfo.pickInfo.pickedPoint.z;
						}
						break;
				}

				// Update display
				updateMeasurementDisplay();
				break;
		}
	});
}

// Updates the text displaying the length of the measurement line
function updateMeasurementDisplay() {
	// If one of the measurement points is missing
	if(!mtMeasPoint1.isVisible || !mtMeasPoint2.isVisible) {
		mtMeasText.text = "Measurement line is not drawn";
		mtMeasText.color = "red";
		return;
	}

	// If one of the reference points is missing
	if(!mtRefPoint1.isVisible || !mtRefPoint2.isVisible) {
		mtMeasText.text = "Reference line is not drawn";
		mtMeasText.color = "red";
		return;
	}

	let measurementVector = mtMeasPoint2.position.subtract(mtMeasPoint1.position);
	let referenceVector = mtRefPoint2.position.subtract(mtRefPoint1.position);

	// If the reference line is of length 0
	if(referenceVector.length() === 0) {
		mtMeasText.text = "Reference line can't have a length of 0";
		mtMeasText.color = "red";
		return;
	}

	let referenceMeterLength = ConversionHelper.stringToMeters(mtRefInput.text);

	// If the conversion failed (= returned NaN)
	if(isNaN(referenceMeterLength)) {
		mtMeasText.text = "Reference line length is invalid";
		mtMeasText.color = "red";
		return;
	}

	let measurementMeterLength = measurementVector.length() * referenceMeterLength / referenceVector.length()
	mtMeasText.text = ConversionHelper.metersToString(measurementMeterLength);
	mtMeasText.color = "green";
}

// Disables the measurement tool for the current mesh, if any
function disableMeasurements() {
	// If an observer has been defined, remove it
	if(mtMeasurementObserver) {
		scene.onPointerObservable.remove(mtMeasurementObserver);
		mtMeasurementObserver = null;
	}

	// clear text field
	mtRefInput.text = "";

	// hide measurement objects
	mtRefPoint1.isVisible = false;
	mtRefPoint2.isVisible = false;
	mtMeasPoint1.isVisible = false;
	mtMeasPoint2.isVisible = false;
	mtReferenceLine.isVisible = false;
	mtMeasurementLine.isVisible = false;
	mtGUI.isVisible = false;
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

			// Show measurement tool button
			mtButton.isVisible = true;
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
					// If __root__ has only one child, save it and not __root__
					meshes[index] = result.meshes[0].getChildMeshes()[0];
				} else {
					// If it's not a .glb, or __root__ contains several meshes, just take the root mesh
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

				// Show measurement tool button
				mtButton.isVisible = true;
			});
		}
	});

	// Add the button to UI, return it so that its properties can be changed if needed
	buttonPanel.addControl(button);
	return button;
}

var createScene = async function () {
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

    mtMeasPoint1 = BABYLON.MeshBuilder.CreateSphere("measPoint1", {diameter: 0.05}, scene);
    mtMeasPoint1.material = sphereMat;
	mtMeasPoint1.isPickable = false;

    mtMeasPoint2 = BABYLON.MeshBuilder.CreateSphere("measPoint2", {diameter: 0.05}, scene);
    mtMeasPoint2.material = sphereMat;
	mtMeasPoint2.isPickable = false;

    mtRefPoint1 = BABYLON.MeshBuilder.CreateSphere("refPoint1", {diameter: 0.05}, scene);
    mtRefPoint1.material = refMat;
	mtRefPoint1.isPickable = false;

    mtRefPoint2 = BABYLON.MeshBuilder.CreateSphere("refPoint2", {diameter: 0.05}, scene);
    mtRefPoint2.material = refMat;
	mtRefPoint2.isPickable = false;

	// Import mesh from an online source
	// Target website must implement CORS so that it can serve a file to another domain
	// BABYLON.ImportMeshAsync("https://babylontest.netlify.app/fountain.glb", scene).then(function (result) {
    //     // Resize and move mesh after import
		   //result.meshes[0].scaling = new BABYLON.Vector3(2,2,2);
	//     //result.meshes[0].position = new BABYLON.Vector3(0.5,-1.5,2);
    // });

	// UI Base (all UI elements are children of this)
	var advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

	// Creation of a Stack Panel to store the buttons for each mesh
	buttonPanel = new BABYLON.GUI.StackPanel("Button Container");
	advancedTexture.addControl(buttonPanel); // add to UI

	// Creation of the buttons for each fountain mesh
	//createMeshButton("Fountain", "./meshes/fountain.glb");
	//createMeshButton("Fountain Light", "./meshes/fountainLight.glb");
	//createMeshButton("Fountain Downscaled", "./meshes/fountainDownscaled.glb");
	createMeshButton("Morosini Fountain", "./meshes/fountainLightDownscaled.glb");
	createMeshButton("Karydaki", "./meshes/Re-karydaki.glb");
	//createMeshButton("Monstree GS Original", "./meshes/monstree.ply");
	//createMeshButton("Monstree GS Clean", "./meshes/monstree_cleaned.ply");
	//createMeshButton("Monstree GS Compressed", "./meshes/monstree_cleaned_compressed.ply");
	//createMeshButton("Monstree GS .splat", "./meshes/monstree.splat");

	// For Monstree, move the mesh after load, because it is not centered
	createMeshButton("Monstree", "./meshes/monstree.glb", (mesh) => {
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
		mtButton.isVisible = false;

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
	mtMeasurementLine = new BABYLON.GUI.MultiLine("Measurement Line");
    mtMeasurementLine.add(mtMeasPoint1, mtMeasPoint2);
    mtMeasurementLine.color = "red";
    advancedTexture.addControl(mtMeasurementLine);

	// Reference line, basis for the conversion of mesh units into real-world units
    mtReferenceLine = new BABYLON.GUI.MultiLine("Reference Line");
    mtReferenceLine.add(mtRefPoint1, mtRefPoint2);
    mtReferenceLine.color = "purple";
    advancedTexture.addControl(mtReferenceLine);

	// Button with a measuring tape icon, to activate the measurement tool
	mtButton = new BABYLON.GUI.Button("MTButton");
	const tapeImage = new BABYLON.GUI.Image("MTButtonImage", "./gui/measure-tape-white.png");
	mtButton.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
	mtButton.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    mtButton.left = "10px";
    mtButton.top = "-10px";
    mtButton.width = "90px";
	mtButton.height = "90px";
	mtButton.cornerRadius = 10;
	mtButton.background = "#222222aa";
    mtButton.thickness = 2;
	mtButton.isVisible = false; // only visible when a mesh is loaded, not by default
    mtButton.addControl(tapeImage);
    advancedTexture.addControl(mtButton);

	// On click, activate tool
	mtButton.onPointerClickObservable.add(() => {
		enableMeasurements();
		updateMeasurementDisplay();
	});

	// Load GUI created with editor, get the measurement UI from it (by cloning and putting the clone in advancedTexture), then dispose of the loaded GUI
	let loadedGUI = await BABYLON.GUI.AdvancedDynamicTexture.ParseFromFileAsync("./gui/measurementToolGUI.json");
	mtGUI = loadedGUI.getControlByName("MeasurementUI").clone();
	advancedTexture.addControl(mtGUI);
	loadedGUI.dispose();

	// Get the close button and make it disable the tool
	let mtCloseButton = advancedTexture.getControlByName("MTCloseButton");
	mtCloseButton.onPointerUpObservable.add(() => {
		disableMeasurements();
		mtButton.isVisible = true;
	});

	mtMeasText = advancedTexture.getControlByName("MTMeasText");
	mtRefInput = advancedTexture.getControlByName("MTRefInput");
	
	// Updates length text when the reference length has been changed
	mtRefInput.onTextChangedObservable.add((_eventData, _eventState) => {
		updateMeasurementDisplay();
	});

	// Measurements are disabled by default since there's no mesh
	disableMeasurements();

	// Allows access to the debug mode of BabylonJS, including an inspector.
	// Convenient for debugging.
	//scene.debugLayer.show();
	
    return scene;
};

// Creation of the Babylon Engine
var engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
var scene;

// Create scene asynchronously, then when it's ready, define render loop to render the frames of the scene
createScene().then((loadedScene) => {
	scene = loadedScene;
	engine.runRenderLoop(function () {
		loadedScene.render(); // Render the frame in the scene
		divFps.innerHTML = engine.getFps().toFixed() + " FPS"; // Update the FPS counter
	});
});

// Resize when necessary
window.addEventListener("resize", function () {
	engine.resize();
});
