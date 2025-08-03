<script type="module">
        import * as THREE from "https://cdn.skypack.dev/three@0.133.1/build/three.module";
        import { OrbitControls } from "https://cdn.skypack.dev/three@0.133.1/examples/jsm/controls/OrbitControls";
        import gsap from "https://cdn.skypack.dev/gsap@3.7.0";
        
        const containerEl = document.querySelector(".globe-wrapper");
        const canvas3D = containerEl.querySelector("#globe-3d");
        const canvas2D = containerEl.querySelector("#globe-2d-overlay");
        const popupEl = containerEl.querySelector(".globe-popup");
        
        let renderer, scene, camera, rayCaster, controls;
        let overlayCtx = canvas2D.getContext("2d");
        let coordinates2D = [0, 0];
        let pointerPos;
        let clock, mouse, pointer, globe, globeMesh;
        let popupVisible;
        let earthTexture, forestTexture, mapMaterial;
        let popupOpenTl, popupCloseTl;
        
        let dragged = false;
        
        // Coordenadas de las principales zonas boscosas (verde) y deforestadas (rojo)
        const forestAreas = [
            // Amazonas (Brasil, Perú, Colombia)
            { lat: -3.465, long: -62.215, size: 0.12, color: 0x4CAF50 },
            { lat: -2.163, long: -71.950, size: 0.10, color: 0x4CAF50 },
            { lat: -1.456, long: -78.120, size: 0.09, color: 0x4CAF50 },
            
            // Bosque del Congo
            { lat: 0.565, long: 20.879, size: 0.14, color: 0x4CAF50 },
            { lat: -2.876, long: 23.656, size: 0.12, color: 0x4CAF50 },
            
            // Bosques de Indonesia
            { lat: -2.548, long: 118.014, size: 0.11, color: 0x4CAF50 },
            { lat: 0.789, long: 113.921, size: 0.10, color: 0x4CAF50 },
            
            // Bosques de Norteamérica
            { lat: 48.775, long: -121.834, size: 0.09, color: 0x4CAF50 },
            { lat: 45.372, long: -122.583, size: 0.08, color: 0x4CAF50 },
            { lat: 44.058, long: -71.081, size: 0.07, color: 0x4CAF50 },
            
            // Siberia
            { lat: 62.521, long: 96.226, size: 0.15, color: 0x4CAF50 },
            { lat: 67.467, long: 86.565, size: 0.14, color: 0x4CAF50 },
        ];
        
        const deforestedAreas = [
            // Amazonas (áreas deforestadas)
            { lat: -7.257, long: -55.225, size: 0.08, color: 0xF44336 },
            { lat: -9.974, long: -56.086, size: 0.09, color: 0xF44336 },
            
            // Indonesia (áreas deforestadas)
            { lat: -0.502, long: 101.447, size: 0.07, color: 0xF44336 },
            { lat: 1.565, long: 109.876, size: 0.08, color: 0xF44336 },
            
            // África Central
            { lat: 3.202, long: 19.187, size: 0.07, color: 0xF44336 },
            { lat: -6.369, long: 14.245, size: 0.06, color: 0xF44336 },
            
            // Madagascar
            { lat: -19.566, long: 46.731, size: 0.05, color: 0xF44336 },
            
            // Sudeste Asiático
            { lat: 15.870, long: 106.624, size: 0.06, color: 0xF44336 },
        ];
        
        // Define las coordenadas de ciudades importantes
        const fixedPoints = [
            { lat: 40, long: 183, name: "Madrid", color: 0x9C27B0 },  // Madrid
            { lat: 44, long: 167, name: "Milán", color: 0x9C27B0 },  // Milan
            { lat: 41, long: 165, name: "Roma", color: 0x9C27B0 },  // Roma
            { lat: 39, long: 257, name: "Washington", color: 0x9C27B0 },  // Washington
            { lat: 10, long: 258, name: "Panamá", color: 0x9C27B0 }   // Panama
        ];
        
        initScene();
        window.addEventListener("resize", updateSize);
        
        function initScene() {
            renderer = new THREE.WebGLRenderer({ 
                canvas: canvas3D, 
                alpha: true,
                antialias: true
            });
            renderer.setPixelRatio(window.devicePixelRatio);
            
            scene = new THREE.Scene();
            scene.background = null;
            
            // Configurar cámara
            camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
            camera.position.z = 2.5;
            
            // Luz ambiental
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
            scene.add(ambientLight);
            
            // Luz direccional
            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight.position.set(1, 1, 1);
            scene.add(directionalLight);
            
            rayCaster = new THREE.Raycaster();
            rayCaster.far = 2.5;
            mouse = new THREE.Vector2(-1, -1);
            clock = new THREE.Clock();
            
            createOrbitControls();
            
            popupVisible = false;
            
            // Cargador de texturas
            const textureLoader = new THREE.TextureLoader();
            
            // Cargar textura base de la Tierra
            textureLoader.load(
                "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg",
                (mapTex) => {
                    earthTexture = mapTex;
                    earthTexture.wrapS = earthTexture.wrapT = THREE.RepeatWrapping;
                    earthTexture.repeat.set(1, 1);
                    
                    // Crear textura personalizada para áreas forestales
                    createForestTexture().then(customTex => {
                        forestTexture = customTex;
                        createGlobe();
                        createPointer();
                        createPopupTimelines();
                        addCanvasEvents();
                        updateSize();
                        addFixedMarkers();
                        addForestMarkers();
                        addDeforestedMarkers();
                        render();
                    });
                }
            );
        }
        
        function createForestTexture() {
            return new Promise((resolve) => {
                // Crear un canvas para nuestra textura personalizada
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = 2048;
                canvas.height = 1024;
                
                // Rellenar con color base (océano)
                ctx.fillStyle = '#000033';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Función para convertir lat/long a coordenadas de textura
                function latLongToCanvas(lat, long) {
                    const x = ((long + 180) % 360) * (canvas.width / 360);
                    const y = (90 - lat) * (canvas.height / 180);
                    return {x, y};
                }
                
                // Dibujar áreas forestales (verde)
                ctx.fillStyle = '#00FF00';
                forestAreas.forEach(area => {
                    const pos = latLongToCanvas(area.lat, area.long);
                    ctx.beginPath();
                    ctx.arc(pos.x, pos.y, area.size * canvas.width, 0, Math.PI * 2);
                    ctx.fill();
                });
                
                // Dibujar áreas deforestadas (rojo)
                ctx.fillStyle = '#FF0000';
                deforestedAreas.forEach(area => {
                    const pos = latLongToCanvas(area.lat, area.long);
                    ctx.beginPath();
                    ctx.arc(pos.x, pos.y, area.size * canvas.width, 0, Math.PI * 2);
                    ctx.fill();
                });
                
                // Crear textura desde el canvas
                const texture = new THREE.CanvasTexture(canvas);
                texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
                texture.repeat.set(1, 1);
                
                resolve(texture);
            });
        }
        
        function createOrbitControls() {
            controls = new OrbitControls(camera, canvas3D);
            controls.enablePan = false;
            controls.enableZoom = true;
            controls.zoomSpeed = 0.5;
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            controls.minDistance = 2.0;
            controls.maxDistance = 4.0;
            controls.autoRotate = true;
            controls.autoRotateSpeed = 0.5;
            
            let timestamp;
            controls.addEventListener("start", () => {
                timestamp = Date.now();
            });
            controls.addEventListener("end", () => {
                dragged = Date.now() - timestamp > 200;
            });
        }
        
        function createGlobe() {
            const globeGeometry = new THREE.SphereGeometry(1, 64, 64);
            
            mapMaterial = new THREE.ShaderMaterial({
                vertexShader: document.getElementById("vertex-shader-map").textContent,
                fragmentShader: document.getElementById("fragment-shader-map").textContent,
                uniforms: {
                    u_map_tex: { type: "t", value: earthTexture },
                    u_forest_tex: { type: "t", value: forestTexture },
                    u_dot_size: { type: "f", value: 0 },
                    u_pointer: { type: "v3", value: new THREE.Vector3(0, 0, 1) },
                    u_time_since_click: { value: 0 },
                },
                transparent: true,
            });
            
            globe = new THREE.Points(globeGeometry, mapMaterial);
            scene.add(globe);
            
            // Malla para interacción
            globeMesh = new THREE.Mesh(
                globeGeometry,
                new THREE.MeshBasicMaterial({
                    color: 0x222222,
                    transparent: true,
                    opacity: 0.05,
                    visible: false
                })
            );
            scene.add(globeMesh);
        }
        
        function createPointer() {
            const geometry = new THREE.SphereGeometry(0.02, 16, 16);
            const material = new THREE.MeshBasicMaterial({
                color: 0xAC0000,
                transparent: true,
                opacity: 0.8,
            });
            pointer = new THREE.Mesh(geometry, material);
            scene.add(pointer);
        }
        
        function addForestMarkers() {
            forestAreas.forEach((point) => {
                const latRad = (point.lat * Math.PI) / 180;
                const longRad = (point.long * Math.PI) / 180;
                const x = Math.cos(latRad) * Math.cos(longRad);
                const y = Math.sin(latRad);
                const z = Math.cos(latRad) * Math.sin(longRad);
                
                const markerGeometry = new THREE.SphereGeometry(point.size * 0.8, 16, 16);
                const markerMaterial = new THREE.MeshBasicMaterial({ 
                    color: point.color,
                    transparent: true,
                    opacity: 0.7
                });
                
                const marker = new THREE.Mesh(markerGeometry, markerMaterial);
                marker.position.set(x, y, z).normalize();
                marker.scale.multiplyScalar(1.01);
                scene.add(marker);
            });
        }
        
        function addDeforestedMarkers() {
            deforestedAreas.forEach((point) => {
                const latRad = (point.lat * Math.PI) / 180;
                const longRad = (point.long * Math.PI) / 180;
                const x = Math.cos(latRad) * Math.cos(longRad);
                const y = Math.sin(latRad);
                const z = Math.cos(latRad) * Math.sin(longRad);
                
                const markerGeometry = new THREE.SphereGeometry(point.size * 0.8, 16, 16);
                const markerMaterial = new THREE.MeshBasicMaterial({ 
                    color: point.color,
                    transparent: true,
                    opacity: 0.7
                });
                
                const marker = new THREE.Mesh(markerGeometry, markerMaterial);
                marker.position.set(x, y, z).normalize();
                marker.scale.multiplyScalar(1.01);
                scene.add(marker);
            });
        }
        
        function addFixedMarkers() {
            const markerGeometry = new THREE.SphereGeometry(0.02, 16, 16);
            
            fixedPoints.forEach((point) => {
                const latRad = (point.lat * Math.PI) / 180;
                const longRad = (point.long * Math.PI) / 180;
                const x = Math.cos(latRad) * Math.cos(longRad);
                const y = Math.sin(latRad);
                const z = Math.cos(latRad) * Math.sin(longRad);
                
                const markerMaterial = new THREE.MeshBasicMaterial({ 
                    color: point.color,
                    emissive: point.color,
                    emissiveIntensity: 0.5
                });
                
                const marker = new THREE.Mesh(markerGeometry, markerMaterial);
                marker.position.set(x, y, z).normalize();
                marker.scale.multiplyScalar(1.02);
                marker.userData = { name: point.name };
                scene.add(marker);
            });
        }
        
        function updateOverlayGraphic() {
            let activePointPosition = pointer.position.clone();
            activePointPosition.applyMatrix4(globe.matrixWorld);
            const activePointPositionProjected = activePointPosition.clone();
            activePointPositionProjected.project(camera);
            coordinates2D[0] =
                (activePointPositionProjected.x + 1) * containerEl.offsetWidth * 0.5;
            coordinates2D[1] =
                (1 - activePointPositionProjected.y) * containerEl.offsetHeight * 0.5;
            
            const matrixWorldInverse = controls.object.matrixWorldInverse;
            activePointPosition.applyMatrix4(matrixWorldInverse);
            
            if (activePointPosition.z > -1) {
                if (!popupVisible) {
                    popupVisible = true;
                    showPopupAnimation(false);
                }
                
                let popupX = coordinates2D[0];
                popupX -= activePointPositionProjected.x * containerEl.offsetWidth * 0.3;
                
                let popupY = coordinates2D[1];
                const upDown = activePointPositionProjected.y > 0.6;
                popupY += upDown ? 20 : -20;
                
                gsap.set(popupEl, {
                    x: popupX,
                    y: popupY,
                    xPercent: -35,
                    yPercent: upDown ? 0 : -100,
                });
                
                popupY += upDown ? -5 : 5;
                const curveMidX = popupX + activePointPositionProjected.x * 100;
                const curveMidY = popupY + (upDown ? -0.5 : 0.1) * coordinates2D[1];
                
                drawPopupConnector(
                    coordinates2D[0],
                    coordinates2D[1],
                    curveMidX,
                    curveMidY,
                    popupX,
                    popupY
                );
            } else {
                if (popupVisible) {
                    popupOpenTl.pause(0);
                    popupCloseTl.play(0);
                }
                popupVisible = false;
            }
        }
        
        function addCanvasEvents() {
            containerEl.addEventListener("mousemove", (e) => {
                updateMousePosition(e.clientX, e.clientY);
            });
            
            containerEl.addEventListener("click", (e) => {
                if (!dragged) {
                    updateMousePosition(
                        e.targetTouches ? e.targetTouches[0].pageX : e.clientX,
                        e.targetTouches ? e.targetTouches[0].pageY : e.clientY
                    );
                    
                    const res = checkIntersects();
                    if (res.length) {
                        pointerPos = res[0].point.clone();
                        pointer.position.copy(pointerPos);
                        mapMaterial.uniforms.u_pointer.value = pointerPos;
                        
                        // Mostrar información en el popup
                        const latLong = cartesianToLatLong();
                        let locationInfo = latLong;
                        
                        // Verificar si es un marcador especial
                        if (res[0].object.userData && res[0].object.userData.name) {
                            locationInfo = `${res[0].object.userData.name}<br>${latLong}`;
                        }
                        
                        popupEl.innerHTML = locationInfo;
                        showPopupAnimation(true);
                        clock.start();
                    }
                }
            });
            
            function updateMousePosition(eX, eY) {
                const rect = containerEl.getBoundingClientRect();
                mouse.x = ((eX - rect.left) / containerEl.offsetWidth) * 2 - 1;
                mouse.y = -((eY - rect.top) / containerEl.offsetHeight) * 2 + 1;
            }
        }
        
        function checkIntersects() {
            rayCaster.setFromCamera(mouse, camera);
            const intersects = rayCaster.intersectObjects(scene.children);
            
            // Buscar solo los objetos que tienen material (excluyendo los puntos del globo)
            const validIntersects = intersects.filter(item => 
                item.object.material && 
                (item.object !== globe && item.object !== globeMesh)
            );
            
            document.body.style.cursor = validIntersects.length ? "pointer" : "auto";
            return validIntersects;
        }
        
        function render() {
            mapMaterial.uniforms.u_time_since_click.value = clock.getElapsedTime();
            
            if (pointer) {
                updateOverlayGraphic();
            }
            
            controls.update();
            renderer.render(scene, camera);
            requestAnimationFrame(render);
        }
        
        function updateSize() {
            const minSide = Math.min(window.innerWidth, window.innerHeight) * 0.7;
            containerEl.style.width = minSide + "px";
            containerEl.style.height = minSide + "px";
            
            renderer.setSize(minSide, minSide);
            canvas2D.width = minSide;
            canvas2D.height = minSide;
            
            camera.aspect = 1;
            camera.updateProjectionMatrix();
            
            mapMaterial.uniforms.u_dot_size.value = 0.02 * minSide;
        }
        
        //  ---------------------------------------
        //  HELPERS
        
        // Convertir coordenadas cartesianas a latitud/longitud
        function cartesianToLatLong() {
            const pos = pointer.position;
            const lat = 90 - Math.acos(pos.y) * 180 / Math.PI;
            const lng = (270 + Math.atan2(pos.x, pos.z) * 180 / Math.PI) % 360 - 180;
            return formatCoordinate(lat, "N", "S") + ", " + formatCoordinate(lng, "E", "W");
        }
        
        function formatCoordinate(coordinate, positiveDirection, negativeDirection) {
            const direction = coordinate >= 0 ? positiveDirection : negativeDirection;
            return `${Math.abs(coordinate).toFixed(2)}° ${direction}`;
        }
        
        // Animaciones para mostrar/ocultar popup
        function createPopupTimelines() {
            popupOpenTl = gsap.timeline({ paused: true })
                .to(pointer.material, { duration: 0.2, opacity: 1 }, 0)
                .fromTo(canvas2D, { opacity: 0 }, { duration: 0.3, opacity: 1 }, 0.15)
                .fromTo(popupEl, { 
                    opacity: 0, 
                    scale: 0.9 
                }, { 
                    duration: 0.2, 
                    opacity: 1, 
                    scale: 1 
                }, 0.2);
            
            popupCloseTl = gsap.timeline({ paused: true })
                .to(pointer.material, { duration: 0.2, opacity: 0 }, 0)
                .to(canvas2D, { duration: 0.2, opacity: 0 }, 0)
                .to(popupEl, { 
                    duration: 0.2, 
                    opacity: 0, 
                    scale: 0.9 
                }, 0);
        }
        
        function showPopupAnimation(lifted) {
            if (lifted) {
                let positionLifted = pointer.position.clone();
                positionLifted.multiplyScalar(1.3);
                gsap.from(pointer.position, {
                    duration: 0.25,
                    x: positionLifted.x,
                    y: positionLifted.y,
                    z: positionLifted.z,
                    ease: "power3.out"
                });
            }
            popupCloseTl.pause(0);
            popupOpenTl.play(0);
        }
        
        // Dibujar línea entre el puntero y el popup
        function drawPopupConnector(startX, startY, midX, midY, endX, endY) {
            overlayCtx.clearRect(0, 0, containerEl.offsetWidth, containerEl.offsetHeight);
            
            overlayCtx.strokeStyle = "#ffffff";
            overlayCtx.lineWidth = 2;
            overlayCtx.lineCap = "round";
            overlayCtx.beginPath();
            overlayCtx.moveTo(startX, startY);
            overlayCtx.quadraticCurveTo(midX, midY, endX, endY);
            overlayCtx.stroke();
        }
    </script>