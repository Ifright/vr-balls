import * as THREE from 'three/build/three.module.js'
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js'
import {VRButton} from "three/examples/jsm/webxr/VRButton"
import {BoxLineGeometry} from "three/examples/jsm/geometries/BoxLineGeometry"
import {XRControllerModelFactory} from "three/examples/jsm/webxr/XRControllerModelFactory";
import flashLightPack from "../assets/flash-light.glb"
import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader";
import {CanvasUI} from "./utils/CanvasUI";

import veniceSunset from '../assets/venice_sunset_1k.hdr';

import VillageGlb from "../assets/quaint_village.glb"
import IslandGlb from "../assets/floating_island.glb"
import CathedralGlb from "../assets/cathedral.glb"
import PortalOfDoomGlb from "../assets/portal_of_doom.glb"

import {SpotLightVolumetricMaterial} from "./utils/SpotLightVolumetricMaterial";
import {LoadingBar} from "./LoadingBar";
import {FlashLightController} from "./controllers/FlashLightController";
import scene from "three/examples/jsm/offscreen/scene";
import {DragController} from "./controllers/DragController";
import {PistolController} from "./controllers/PistolController";
const DEFAULT_PROFILE = 'generic-trigger';

class App {
    constructor() {
        const container = document.createElement('div')
        document.body.appendChild(container)

        this.camera = new THREE.PerspectiveCamera(60,
            window.innerWidth / window.innerHeight, 0.1, 100)
        this.camera.position.set(0, 0, 2)
        this.camera = new THREE.PerspectiveCamera(50,
            window.innerWidth / window.innerHeight, 0.1, 100)
        this.camera.position.set(0, 1.6, 3)

        this.scene = new THREE.Scene()
        this.scene.background = new THREE.Color(0x505050)

        // const ambient = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 0.3)
        const ambient = new THREE.HemisphereLight(0x606060, 0x404040, 1)
        this.scene.add(ambient)

        const light = new THREE.DirectionalLight(0xffffff)
        // light.position.set(0.2, 1, 1)
        light.position.set(1, 1, 1).normalize()
        this.scene.add(light)

        this.renderer = new THREE.WebGLRenderer({antialias: true})
        this.renderer.setPixelRatio(window.devicePixelRatio)
        this.renderer.setSize(window.innerWidth, window.innerHeight)
        this.renderer.outputEncoding = THREE.sRGBEncoding
        container.appendChild(this.renderer.domElement)

        // Add loading bar
        this.loadingBar = new LoadingBar()
        const self = this

        this.loadGltf(VillageGlb, glbScene => {
            const scale = .6
            glbScene.scale.set(scale, scale, scale)
            glbScene.position.y = 4.87
            glbScene.rotateY(Math.PI / 180 * 180)
        })
        this.loadGltf(CathedralGlb, glbScene => {
            const scale = .6
            glbScene.scale.set(scale, scale, scale)
            glbScene.position.y = 9.37
            glbScene.position.z = -19.197
        })
        this.loadGltf(IslandGlb, glbScene => {
            const scale = .3
            glbScene.scale.set(scale, scale, scale)
            glbScene.position.x = 8
            glbScene.position.y = 13
            glbScene.position.z = 8
            glbScene.rotateY(Math.PI / 180 * 90)
        })


        this.loadGltf(PortalOfDoomGlb, glbScene => {
            const scale = .3
            glbScene.scale.set(scale, scale, scale)
            glbScene.position.x = -5
            glbScene.position.y = 20
            glbScene.position.z = -5
            glbScene.rotateY(Math.PI / 180 * 90)
            self.portalOfDoomGlb = glbScene
        })

        this.controllers = []
        this.controls = new OrbitControls(this.camera, this.renderer.domElement)
        this.controls.target.set(0, 1.6, 0)
        this.controls.update()

        this.raycaster = new THREE.Raycaster()
        this.workingMatrix = new THREE.Matrix4()
        this.workingVector = new THREE.Vector3()

        this.spotlights = {}

        // this.initSceneCube()
        this.initScene()
        this.setupVR()

        this.clock = new THREE.Clock()

        this.renderer.setAnimationLoop(this.render.bind(this))

        window.addEventListener('resize', this.resize.bind(this))
    }

    loadGltf(glbFile, handleScene) {
        const self = this
        const loader = new GLTFLoader()
        loader.load(
            glbFile,
            (gltf) => {
                let glbScene = gltf.scene
                handleScene(glbScene)
                self.scene.add(gltf.scene)
                self.loadingBar.visible = false
                self.renderer.setAnimationLoop(self.render.bind(self))

            },
            (xhr) => {
                self.loadingBar.progress = xhr.loaded / xhr.total
            },
            err => {
                console.error(`An error happened: ${err}`)
            }
        )
    }

    random(min, max) {
        return Math.random() * (max - min) + min;
    }

    initSceneCube() {
        const geometry = new THREE.BoxBufferGeometry()
        const material = new THREE.MeshStandardMaterial({color: 0xFF0000})

        this.mesh = new THREE.Mesh(geometry, material)

        this.scene.add(this.mesh)

        const geometrySphere = new THREE.SphereGeometry(.7, 32, 16)
        const materialSphere = new THREE.MeshBasicMaterial({color: 0xffff00})
        const sphere = new THREE.Mesh(geometrySphere, materialSphere)
        this.scene.add(sphere)

        // sphere.position.set(1.5, 0, 0)
    }


    initScene() {
        this.radius = 0.08

        this.movableObjects = new THREE.Group();
        this.scene.add(this.movableObjects);

        this.room = new THREE.LineSegments(
            new BoxLineGeometry(6, 6, 6, 10, 10, 10),
            new THREE.LineBasicMaterial({color: 0x808080})
        )
        this.room.geometry.translate(0, 3, 0)
        // this.scene.add( this.room )

        const geometry = new THREE.IcosahedronBufferGeometry(this.radius, 2)

        for (let i = 0; i < 600; i++) {

            const object = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({color: Math.random() * 0xffffff}))

            object.position.x = this.random(-10, 10)
            object.position.y = this.random(0, 20)
            object.position.z = this.random(-29, 10)

            // this.room.add( object)
            this.movableObjects.add(object)
        }
        this.highlight = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
            color: 0xFFFFFF, side: THREE.BackSide
        }))
        this.highlight.scale.set(1.2, 1.2, 1.2)
        this.scene.add(this.highlight)

    }

    createUI(){
        const config = {
            panelSize: { height: 0.8 },
            height: 500,
            body: { type: "text" }
        }
        const ui = new CanvasUI( { body: "" }, config );
        ui.mesh.position.set(0, 1.5, -1);
        this.scene.add( ui.mesh );
        return ui;
    }

    updateUI(ui, buttonStates){
        if (!buttonStates) {
            return
        }

        const str = JSON.stringify(buttonStates, null, 2);
        if (!ui.userData || ui.userData.strStates === undefined
            || ( str != this.strStates )){
            ui.updateElement( 'body', str );
            ui.update();
            if (!ui.userData) {
                ui.usetData = {}
            }
            this.strStates = str;
        }
    }

    createButtonStates(components) {
        const buttonStates = {}
        this.gamepadIndices = components
        Object.keys(components).forEach(key => {
            if (key.includes('touchpad') || key.includes('thumbstick')) {
                buttonStates[key] = {button: 0, xAxis: 0, yAxis: 0}
            } else {
                buttonStates[key] = 0
            }
        })
        this.buttonStates = buttonStates
    }

    showDebugText() {
        const dt = this.clock.getDelta()

        if (this.renderer.xr.isPresenting) {
            const self = this
            if (this.controllers) {
                this.controllers.forEach(controller => controller.handle())
            }
            if (this.elapsedTime == undefined) {
                this.elapsedTime = 0
            }
            this.elapsedTime += dt
            if (this.elapsedTime > 0.3) {
                // this.updateGamepadState()
                this.elapsedTime = 0
                if (this.controllers.length > 0) {
                    this.updateUI(this.leftUi, this.controllers[0].buttonStates)
                }
                if (this.controllers.length > 1) {
                    this.updateUI(this.rightUi, this.controllers[1].buttonStates)
                }

            }
        } else {
            // this.stats.update()
        }
    }

    setupVR() {
        this.renderer.xr.enabled = true
        document.body.appendChild(VRButton.createButton(this.renderer))
        const self = this
        let i = 0

        // this.controllers[i] = new PistolController(this.renderer, i++, this.scene, this.movableObjects, this.highlight,
        //  event => this.onConnectedRight(event, self))
        this.controllers[i] = new FlashLightController(this.renderer, i++, this.scene, this.movableObjects, this.highlight,
            event => this.onConnectedRight(event, self))
        // this.buildStandardController(i++)
        this.controllers[i] = new DragController(this.renderer, i++, this.scene, this.movableObjects, this.highlight,
            event => this.onConnectedRight(event, self))
        // this.controllers[i] = new PistolController(this.renderer, i, this.scene, this.movableObjects, this.highlight)
        // this.controllers[i] = new FlashLightController(this.renderer, i++, this.scene, this.movableObjects, this.highlight,
        //     event => this.onConnectedRight(event, self))
        // this.buildStandardController(i++)

        if (this.controllers.length > 1) {
            this.leftUi = this.createUI()
            this.leftUi.mesh.position.set(-.6, 1.5, -1)
            this.rightUi = this.createUI()
            this.rightUi.mesh.position.set(.6, 1.5, -1)
        } else {
            this.leftUi = this.createUI()
        }

    }

    flashLightController(index) {
        const self = this

        function onSelectStart() {
            this.userData.selectPressed = true
            if (self.spotlights[this.uuid]) {
                self.spotlights[this.uuid].visible = true
            } else {
                this.children[0].scale.z = 10
            }
        }

        function onSelectEnd() {
            self.highlight.visible = false
            this.userData.selectPressed = false
            if (self.spotlights[this.uuid]) {
                self.spotlights[this.uuid].visible = false
            } else {
                this.children[0].scale.z = 0
            }
        }

        let controller = this.renderer.xr.getController(index)
        controller.addEventListener('selectstart', onSelectStart);
        controller.addEventListener('selectend', onSelectEnd);
        controller.addEventListener('connected', function (event) {
            self.buildFlashLightController.call(self, event.data, this)
        })
        controller.addEventListener('disconnected', function () {
            while (this.children.length > 0) {
                this.remove(this.children[0])
                const controllerIndex = self.controllers.idexOf(this)
                self.controllers[controllerIndex] = null
            }
        })
        controller.handle = () => this.handleFlashLightController(controller)

        this.controllers[index] = controller
        this.scene.add(controller)
    }


    buildFlashLightController(data, controller) {
        let geometry, material, loader

        const self = this

        if (data.targetRayMode === 'tracked-pointer') {
            loader = new GLTFLoader()
            loader.load(flashLightPack, (gltf) => {
                    const flashLight = gltf.scene.children[2]
                    const scale = 0.6
                    flashLight.scale.set(scale, scale, scale)
                    controller.add(flashLight)
                    const spotlightGroup = new THREE.Group()
                    self.spotlights[controller.uuid] = spotlightGroup

                    const spotlight = new THREE.SpotLight(0xFFFFFF, 2, 12, Math.PI / 15,
                        0.3)
                    spotlight.position.set(0, 0, 0)
                    spotlight.target.position.set(0, 0, -1)
                    spotlightGroup.add(spotlight.target)
                    spotlightGroup.add(spotlight)
                    controller.add(spotlightGroup)

                    spotlightGroup.visible = false

                    geometry = new THREE.CylinderBufferGeometry(0.03, 1, 5, 32, true)
                    geometry.rotateX(Math.PI / 2)
                    material = new SpotLightVolumetricMaterial()
                    const cone = new THREE.Mesh(geometry, material)
                    cone.translateZ(-2.6)
                    spotlightGroup.add(cone)
                },
                null,
                (error) => console.error(`An error happened: ${error}`)
            )
        } else if (data.targetRayMode == 'gaze') {
            geometry = new THREE.RingBufferGeometry(0.02, 0.04, 32).translate(0, 0, -1);
            material = new THREE.MeshBasicMaterial({opacity: 0.5, transparent: true});
        }
    }

    buildStandardController(index) {
        const controllerModelFactory = new XRControllerModelFactory()
        const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, -1)
        ])
        const line = new THREE.Line(geometry)
        line.name = 'line'
        line.scale.z = 0

        const controller = this.renderer.xr.getController(index)

        controller.add(line)
        controller.userData.selectPressed = false

        const grip = this.renderer.xr.getControllerGrip(index)
        grip.add(controllerModelFactory.createControllerModel(grip))
        this.scene.add(grip)

        const self = this

        function onSelectStart() {
            this.children[0].scale.z = 10
            this.userData.selectPressed = true
        }

        function onSelectEnd() {
            this.children[0].scale.z = 0
            self.highlight.visible = false
            this.userData.selectPressed = false
        }

        controller.addEventListener('selectstart', onSelectStart);
        controller.addEventListener('selectend', onSelectEnd);

        controller.handle = () => this.handleController(controller)

        this.scene.add(controller)
        this.controllers[index] = controller
    }

    handleController(controller) {
        if (controller.userData.selectPressed) {
            controller.children[0].scale.z = 10
            this.workingMatrix.identity().extractRotation(controller.matrixWorld)

            this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld)

            this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.workingMatrix)

            const intersects = this.raycaster.intersectObjects(this.room.children)

            if (intersects.length > 0) {
                if (intersects[0].object.uuid !== this.highlight.uuid) {
                    intersects[0].object.add(this.highlight)
                }
                this.highlight.visible = true
                controller.children[0].scale.z = intersects[0].distance
            } else {
                this.highlight.visible = false
            }
        }
    }

    handleFlashLightController(controller) {
        if (controller.userData.selectPressed) {
            this.workingMatrix.identity().extractRotation(controller.matrixWorld)

            this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld)

            this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.workingMatrix)

            const intersects = this.raycaster.intersectObjects(this.room.children)

            if (intersects.length > 0) {
                if (intersects[0].object.uuid !== this.highlight.uuid) {
                    intersects[0].object.add(this.highlight)
                }
                this.highlight.visible = true
            } else {
                this.highlight.visible = false
            }
        }
    }

    resize() {
        this.camera.aspect = window.innerWidth / window.innerHeight
        this.camera.updateProjectionMatrix()
        this.renderer.setSize(window.innerWidth, window.innerHeight)
    }

    render() {
        const dt = this.clock.getDelta()
        if (this.mesh) {
            this.mesh.rotateX(0.005)
            this.mesh.rotateY(0.01)
        }

        if (this.renderer.xr.isPresenting
            && this.portalOfDoomGlb
            && this.controllers.length > 0
            && this.controllers[0].buttonStates
        ) {
            if(this.controllers[0]
                    .buttonStates["xr_standard_thumbstick"].button) {
                const scale = .5
                this.portalOfDoomGlb.scale.set(scale, scale, scale)
                // this.portalOfDoomGlb.rotateY(Math.PI / 180 * 10)
            } else {
                const scale = .3
                this.portalOfDoomGlb.scale.set(scale, scale, scale)
            }

            const xAxis = this.controllers[0].buttonStates["xr_standard_thumbstick"].xAxis
            // const xAxis = 1
            this.portalOfDoomGlb.rotateY(Math.PI / 180 * xAxis * 10)

            if (this.controllers[0].buttonStates["xr_standard_thumbstick"]) {
                const yAxis = this.controllers[0]
                    .buttonStates["xr_standard_thumbstick"].yAxis
                this.portalOfDoomGlb.translateY(0.05 * yAxis)
            }
        }

        if (this.renderer.xr.isPresenting && this.controllers) {
            this.controllers.forEach(controller => controller.handle())
        }



        this.showDebugText()

        this.renderer.render(this.scene, this.camera)
    }
}
export {App}
