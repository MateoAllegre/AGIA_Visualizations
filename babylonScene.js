/// <reference path="babylon.d.ts" />
/// <reference path="babylon.gui.d.ts" />

var canvas = document.getElementById("renderCanvas");
let divFps = document.getElementById("fps");
var createScene = function () {
    var scene = new BABYLON.Scene(engine);
	var camera = new BABYLON.ArcRotateCamera("camera",
											BABYLON.Tools.ToRadians(90),
											BABYLON.Tools.ToRadians(90),
											12, BABYLON.Vector3.Zero(),
											scene);
		//camera.wheelDeltaPercentage = 0.02;
		camera.wheelPrecision = 50;
		camera.attachControl(canvas, true);
    var light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 1, 0), scene);
        
	// BABYLON.ImportMeshAsync("https://babylontest.netlify.app/fountain.glb", scene).then(function (result) {
    //     //result.meshes[0].scaling = new BABYLON.Vector3(2,2,2);
	// 	//result.meshes[0].position = new BABYLON.Vector3(0.5,-1.5,2);
    // });

	// UI Base
	var advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
	// advancedTexture.renderScale = 3;
	// advancedTexture.rootContainer.scaleX = advancedTexture.rootContainer.scaleY = advancedTexture.renderScale;

	var fountainMesh = null;

	// Fountain button
	var fountainButton = BABYLON.GUI.Button.CreateSimpleButton("loadFountain", "Fontaine");
	fountainButton.width = "6%";
	fountainButton.height = "4%";
	fountainButton.fontSize = 20;
	//fountainButton.fontSizeInPixels *= advancedTexture.renderScale;
	fountainButton.background = "red";
	fountainButton.color = "darkred";
	fountainButton.cornerRadius = 3;
	// fountainButton.cornerRadius *= advancedTexture.renderScale;
	fountainButton.thickness = 3;
	// fountainButton.thickness *= advancedTexture.renderScale;
	fountainButton.onPointerUpObservable.add(() => {
		console.time("Chargement du modele");
		console.log("Debut du chargement du modele");
		fountainButton.isVisible = false;
		menuButton.isVisible = true;
		BABYLON.ImportMeshAsync("./fountain.glb", scene).then(function (result) {
		    //result.meshes[0].scaling = new BABYLON.Vector3(2,2,2);
			//result.meshes[0].position = new BABYLON.Vector3(0.5,-1.5,2);
			fountainMesh = result.meshes[0];
			console.timeEnd("Chargement du modele");
		});
	});
	advancedTexture.addControl(fountainButton);

	// Menu button
	var menuButton = BABYLON.GUI.Button.CreateSimpleButton("menu", "Retour au Menu");
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
	menuButton.onPointerUpObservable.add(() => {
		fountainButton.isVisible = true;
		menuButton.isVisible = false;
		fountainMesh.dispose(); // inaccessible
	});
	advancedTexture.addControl(menuButton);
	menuButton.isVisible = false;

	// console.time("Chargement du modele");
	// console.log("Debut du chargement du modele");
	// BABYLON.ImportMeshAsync("./fountain.glb", scene).then(function (result) {
    //     //result.meshes[0].scaling = new BABYLON.Vector3(2,2,2);
	// 	//result.meshes[0].position = new BABYLON.Vector3(0.5,-1.5,2);
	// 	console.timeEnd("Chargement du modele");
    // });

	//scene.debugLayer.show();
	//scene.performancePriority = BABYLON.ScenePerformancePriority.Intermediate;
	
    return scene;
};

var engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
var scene = createScene();

   engine.runRenderLoop(function () {
	if (scene) {
		scene.render();
		divFps.innerHTML = engine.getFps().toFixed() + " FPS"
	}
});

// Resize
window.addEventListener("resize", function () {
	engine.resize();
});
