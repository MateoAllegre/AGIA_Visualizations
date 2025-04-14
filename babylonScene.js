// Reference files, in order for intellisense to work with babylon functions and types
/// <reference path="babylon.d.ts" />
/// <reference path="babylon.gui.d.ts" />

"use strict"; // strict mode to guarantee better coding

// HTML elements (divs) for the render canvas, and for the fps counter
var canvas = document.getElementById("renderCanvas");
let divFps = document.getElementById("fps");

// Global variables
var meshes = []; // List of currently loaded meshes
var menuButton; // Menu button, needs to be global so that all buttons can enable it on click.
var buttonPanel; // Panel containing mesh buttons, global so that mesh buttons can add themselves to it
var activeMeshIndex; // Index (in meshes array) of most recently rendered mesh

// This function takes a name and a file, and creates a button in the menu with "name" as text
// that loads and displays the mesh pointed by "meshSource", which can be a filepath or URL.
const createMeshButton = function (name, meshSource, meshOperations) {
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
				meshes[index] = result.meshes[0];
				if(typeof meshOperations !== "undefined") meshOperations(meshes[index]); // Apply given operations to mesh, if any
				console.timeEnd("Loading " + name); // Stop timing (that also logs the time)
				engine.hideLoadingUI(); // hide the load screen
				menuButton.isVisible = true; // show menu button (after load only, or you can click it through the load screen which breaks everything)
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
	buttonPanel = new BABYLON.GUI.StackPanel();
	advancedTexture.addControl(buttonPanel); // add to UI

	// Creation of the buttons for each fountain mesh
	createMeshButton("Fountain", "./fountain.glb");
	createMeshButton("Fountain Light", "./fountainLight.glb");
	createMeshButton("Fountain Downscaled", "./fountainDownscaled.glb");
	createMeshButton("Fountain Minimal", "./fountainLightDownscaled.glb");

	// For Monstree, move the mesh after load, because it is not centered
	createMeshButton("Monstree", "./monstree.glb", (mesh) => {
		mesh.position = new BABYLON.Vector3(0.5,-1.5,2);
	});

	// Menu button configuration
	menuButton = BABYLON.GUI.Button.CreateSimpleButton("menu", "Back to Menu");
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

		// Disable current mesh (makes it invisible and improves performance)
		meshes[activeMeshIndex].setEnabled(false);
	});

	// Add menu button to the UI and make it invisible
	advancedTexture.addControl(menuButton);
	menuButton.isVisible = false;

	// Allows access to the debug mode of BabylonJS, including an inspector.
	// Convenient for debugging.
	// scene.debugLayer.show();

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
