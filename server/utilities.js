import * as THREE from "three";

export function toVec3(obj) {
    return new THREE.Vector3(obj.x, obj.y, obj.z);
}