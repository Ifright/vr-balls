import * as THREE from "three";
import {Controller} from "./Controller";
import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader";
import pistolPack from "../../assets/pistol.glb"

export class PistolController extends Controller {
    raycaster = new THREE.Raycaster()
    spotlights = {}

    constructor(renderer, index, scene, movableObjects, highlight, onConnected) {
        super(renderer, index)
        this.scene = scene
        this.movableObjects = movableObjects
        this.highlight = highlight

        this.controller.addEventListener('connected', onConnected)
        this.build(index)
    }

    build(index) {
        this.workingMatrix = new THREE.Matrix4()

        const self = this

        let controller = this.renderer.xr.getController(index)

        controller.addEventListener( 'connected', function (event) {
            self.buildPistolController.call(self, event.data, this)
        })
        controller.addEventListener( 'disconnected', function () {
            while(this.children.length > 0) {
                this.remove(this.children[0])
                const controllerIndex = self.controllers.idexOf(this)
                self.controllers[controllerIndex] = null
            }
        })
        controller.handle = () => this.handleFlashLightController(controller)

          this.scene.add(controller)
    }

    handle() {
        super.handle()
        if (this.controller.userData.selectPressed) {
            this.controller.children[0].scale.z = 10
            this.workingMatrix.identity().extractRotation( controller.matrixWorld)

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

    buildPistolController(data, controller) {
        let geometry, material, loader

        const self = this

        if (data.targetRayMode === 'tracked-pointer') {
            loader = new GLTFLoader()
            loader.load(pistolPack, (gltf) => {
                    // const pistol = gltf.scene.children[2]
                    const pistol = gltf.scene
                    const scale = 0.01
                    pistol.scale.set(scale, scale, scale)
                    pistol.rotateY(Math.PI / 180 * 90)
                    pistol.position.set(0, -0.1, 0)
                    controller.add(pistol)
                },
                null,
                (error) => console.error(`An error happened: ${error}`)
            )
        } else if (data.targetRayMode == 'gaze') {
            geometry = new THREE.RingBufferGeometry(0.02, 0.04, 32).translate(0, 0, -1);
            material = new THREE.MeshBasicMaterial({opacity: 0.5, transparent: true});
        }
    }
}