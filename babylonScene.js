/// <reference path="babylon.d.ts" />

var canvas = document.getElementById("renderCanvas");
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
	//var sphere = BABYLON.MeshBuilder.CreateSphere("sphere", {diameter: 100}, scene);
        
	BABYLON.ImportMeshAsync("https://babylontest.netlify.app/fountain.glb", scene).then(function (result) {
        //result.meshes[0].scaling = new BABYLON.Vector3(2,2,2);
		//result.meshes[0].position = new BABYLON.Vector3(0.5,-1.5,2);
    });
	
    return scene;
};

var engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
var scene = createScene();

   engine.runRenderLoop(function () {
	if (scene) {
		scene.render();
	}
});

// Resize
window.addEventListener("resize", function () {
	engine.resize();
});
