// Reference files, in order for intellisense to work with babylon functions and types
/// <reference path="babylon.d.ts" />
/// <reference path="babylon.gui.d.ts" />

"use strict"; // strict mode to guarantee better coding

// HTML elements (divs) for the render canvas, and for the fps counter
var canvas = document.getElementById("renderCanvas");
let divFps = document.getElementById("fps");

// Global variables for the base app
var meshes = []; // List of currently loaded meshes
var activeMeshIndex; // Index (in meshes array) of most recently rendered mesh

var menuButton; // Menu button, needs to be global so that all buttons can enable it on click.
var buttonPanel; // Panel containing mesh buttons, global so that mesh buttons can add themselves to it

import MeasurementTool from "./measurementTool.js";

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
			MeasurementTool.showButton();
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
				MeasurementTool.showButton();
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

	/////////////////////////
	// WebXR Configuration //
	/////////////////////////
/*
	// Initializes WebXR in VR (immersive-vr mode)
	const xrHelper = await scene.createDefaultXRExperienceAsync({
		disableTeleportation: true, // Disable teleportation so we can use movement
	});

	const xrCamera = xrHelper.baseExperience.camera;

	const featureManager = xrHelper.baseExperience.featuresManager;

	var cameraYMovement = 0;

	// Swaps the configuration for the two hands, making it so that left is movement and right is rotation
	const swappedHandednessConfiguration = [
		{
			// Right stick configuration
			allowedComponentTypes: [BABYLON.WebXRControllerComponent.THUMBSTICK_TYPE, BABYLON.WebXRControllerComponent.TOUCHPAD_TYPE],
			forceHandedness: "right",
			axisChangedHandler: (axes, movementState, featureContext, xrInput) => {
				// Apply axes to rotation if above threshold
				movementState.rotateX = Math.abs(axes.x) > featureContext.rotationThreshold ? axes.x : 0;
				//movementState.rotateY = Math.abs(axes.y) > featureContext.rotationThreshold ? axes.y : 0; // disable? does not seem to work anyways
				cameraYMovement = Math.abs(axes.y) > featureContext.rotationThreshold ? -axes.y : 0;
			},
		},
		{
			// Left stick configuration
			allowedComponentTypes: [BABYLON.WebXRControllerComponent.THUMBSTICK_TYPE, BABYLON.WebXRControllerComponent.TOUCHPAD_TYPE],
			forceHandedness: "left",
			axisChangedHandler: (axes, movementState, featureContext, xrInput) => {
				// Apply axes to movement if above threshold
				movementState.moveX = Math.abs(axes.x) > featureContext.movementThreshold ? axes.x : 0;
				movementState.moveY = Math.abs(axes.y) > featureContext.movementThreshold ? axes.y : 0;
			},
		},
	];

	const movementFeature = featureManager.enableFeature(BABYLON.WebXRFeatureName.MOVEMENT, "latest", {
		xrInput: xrHelper.input,
		movementSpeed: 0.1,
		rotationSpeed: 0.4,
		customRegistrationConfigurations: swappedHandednessConfiguration,
	});

	// Camera Y Movement each frame based on the right stick vertical axis
	scene.onBeforeRenderObservable.add(() => {
		if(!xrCamera || !movementFeature) return;

		if(cameraYMovement != 0) {
			// Inspired by internal BabylonJS code for the movement feature
			let yMovement = new BABYLON.Vector3(0, cameraYMovement, 0);
			yMovement.scaleInPlace(xrCamera._computeLocalCameraSpeed() * movementFeature.movementSpeed);
			xrCamera.cameraDirection.addInPlace(yMovement);
		}
	});

	*/

	///////////////////
	// UI of the app //
	///////////////////

	// UI Base (all UI elements are children of this)
	var advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

	// Creation of a Stack Panel to store the buttons for each mesh
	buttonPanel = new BABYLON.GUI.StackPanel("Button Container");
	advancedTexture.addControl(buttonPanel); // add to UI

	////////////////////////////////////////////////////////////////////////////////////

	// Creation of the buttons for each fountain mesh

	///////////////////////
	// Morosini Fountain //
	///////////////////////

	//createMeshButton("Fountain", "./meshes/fountain.glb");
	//createMeshButton("Fountain Light", "./meshes/fountainLight.glb");
	//createMeshButton("Fountain Downscaled", "./meshes/fountainDownscaled.glb");
	//createMeshButton("Morosini Fountain", "./meshes/fountainLightDownscaled.glb");
	createMeshButton("Morosini Fountain", "./meshes/test2.glb");

	/////////////////////////
	//  Karydaki Fountain  //
	/////////////////////////

	createMeshButton("Karydaki", "./meshes/Re-karydaki.glb");

	//////////////
	// Monstree //
	//////////////

	//createMeshButton("Monstree GS Original", "./meshes/monstree.ply");
	//createMeshButton("Monstree GS Clean", "./meshes/monstree_cleaned.ply");
	//createMeshButton("Monstree GS Compressed", "./meshes/monstree_cleaned_compressed.ply");
	createMeshButton("Monstree GS .splat", "./meshes/monstree.splat");

	// For Monstree, move the mesh after load, because it is not centered
	createMeshButton("Monstree", "./meshes/monstree.glb", (mesh) => {
		mesh.position = new BABYLON.Vector3(0.5,-1.5,2);
	});

	////////////////////////////////////////////////////////////////////////////////////

	// UI Elements

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
		MeasurementTool.hideButton();

		// Disable measurement tool
		MeasurementTool.disable();

		// Disable current mesh (makes it invisible and improves performance)
		meshes[activeMeshIndex].setEnabled(false);
	});

	// Add menu button to the UI and make it invisible
	advancedTexture.addControl(menuButton);
	menuButton.isVisible = false;

	////////////////////////////////////////////////////////////////////////////////////

	// Initializing measurement tool //
	await MeasurementTool.init(scene, advancedTexture);

	// Allows access to the debug mode of BabylonJS, including an inspector.
	// Convenient for debugging.
	// scene.debugLayer.show();
	
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
