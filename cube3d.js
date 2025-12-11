// 3D Satellite Visualization with GLB Upload Support
class Satellite3D {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.satellite = null;
        this.controls = null;
        this.autoRotate = true;
        this.showAxes = true;
        this.rotationSpeed = 0.002;
        this.currentRotation = { x: 0, y: 0, z: 0 };
        this.targetRotation = { x: 0, y: 0, z: 0 };
        
        // Model center offset
        this.modelCenter = { x: 0, y: 0, z: 0 };
        this.modelScale = 1.0;
        
        // Loaders
        this.gltfLoader = null;
        this.dracoLoader = null;
        this.modelLoaded = false;
        
        this.init();
    }
    
    init() {
        const container = document.getElementById('satellite-viewer');
        if (!container) {
            console.error("Satellite viewer container not found!");
            return;
        }
        
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0f1e);
        
        // Create camera with better position
        this.camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
        this.camera.position.set(8, 8, 8);
        this.camera.lookAt(0, 0, 0);
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: true
        });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        
        // Clear container and add renderer
        container.innerHTML = '';
        container.appendChild(this.renderer.domElement);
        
        // Add orbit controls with better settings
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.rotateSpeed = 0.5;
        this.controls.minDistance = 2;
        this.controls.maxDistance = 20;
        this.controls.maxPolarAngle = Math.PI;
        this.controls.target.set(0, 0, 0);
        
        // Add lighting
        this.setupLighting();
        
        // Add coordinate axes (smaller)
        this.addAxes();
        
        // Add grid (smaller for better view)
        this.addGrid();
        
        // Initialize loaders
        this.gltfLoader = new THREE.GLTFLoader();
        this.dracoLoader = new THREE.DRACOLoader();
        this.dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
        this.gltfLoader.setDRACOLoader(this.dracoLoader);
        
        // Load default model
        this.loadDefaultModel();
        
        // Handle window resize
        window.addEventListener('resize', () => this.onResize());
        
        // Start animation
        this.animate();
        
        console.log("✅ 3D Satellite initialized");
    }
    
    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);
        
        // Directional light (sun-like)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(10, 20, 15);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;
        this.scene.add(directionalLight);
        
        // Hemisphere light (sky + ground)
        const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
        this.scene.add(hemisphereLight);
        
        // Point light for highlights
        const pointLight = new THREE.PointLight(0x4fc3f7, 0.5, 50);
        pointLight.position.set(5, 5, 5);
        this.scene.add(pointLight);
    }
    
    addAxes() {
        // Smaller axes helper
        const axesHelper = new THREE.AxesHelper(3);
        axesHelper.position.y = -1;
        this.scene.add(axesHelper);
        axesHelper.name = 'coord-axes';
        axesHelper.visible = this.showAxes;
    }
    
    addGrid() {
        const gridHelper = new THREE.GridHelper(15, 15, 0x444444, 0x222222);
        gridHelper.position.y = -1;
        this.scene.add(gridHelper);
    }
    
    addAxisIndicators() {
        // X-axis (Red)
        const xAxis = new THREE.ArrowHelper(
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(0, 0, 0),
            2.5,
            0xff5252,
            0.2,
            0.15
        );
        this.scene.add(xAxis);
        xAxis.name = 'axis-x';
        xAxis.visible = this.showAxes;
        
        // Y-axis (Green)
        const yAxis = new THREE.ArrowHelper(
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(0, 0, 0),
            2.5,
            0x00e676,
            0.2,
            0.15
        );
        this.scene.add(yAxis);
        yAxis.name = 'axis-y';
        yAxis.visible = this.showAxes;
        
        // Z-axis (Blue)
        const zAxis = new THREE.ArrowHelper(
            new THREE.Vector3(0, 0, 1),
            new THREE.Vector3(0, 0, 0),
            2.5,
            0x4fc3f7,
            0.2,
            0.15
        );
        this.scene.add(zAxis);
        zAxis.name = 'axis-z';
        zAxis.visible = this.showAxes;
    }
    
    loadDefaultModel() {
        console.log('🔄 Creating default cube satellite model...');
        
        // Remove existing model
        if (this.satellite) {
            this.scene.remove(this.satellite);
        }
        
        // Create a detailed cube satellite
        this.createDetailedSatellite();
        this.modelLoaded = true;
        
        // Center the model
        this.centerModel(this.satellite);
        
        // Add axis indicators
        this.addAxisIndicators();
        
        // Hide loading indicator
        const loadingIndicator = document.getElementById('model-loading');
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
        
        console.log('✅ Default model loaded and centered');
    }
    
    createDetailedSatellite() {
        // Create satellite group
        this.satellite = new THREE.Group();
        
        // Main body (10x10x10 cm cubesat, scaled up)
        const bodyGeometry = new THREE.BoxGeometry(2, 2, 2);
        
        // Create materials for each face
        const materials = [
            new THREE.MeshStandardMaterial({ 
                color: 0x1a237e, 
                metalness: 0.4, 
                roughness: 0.6,
                emissive: 0x0d1b6b,
                emissiveIntensity: 0.1
            }), // +X (right)
            new THREE.MeshStandardMaterial({ 
                color: 0xb71c1c, 
                metalness: 0.4, 
                roughness: 0.6 
            }), // -X (left)
            new THREE.MeshStandardMaterial({ 
                color: 0x1b5e20, 
                metalness: 0.4, 
                roughness: 0.6 
            }), // +Y (top)
            new THREE.MeshStandardMaterial({ 
                color: 0xff6f00, 
                metalness: 0.4, 
                roughness: 0.6 
            }), // -Y (bottom)
            new THREE.MeshStandardMaterial({ 
                color: 0x4a148c, 
                metalness: 0.4, 
                roughness: 0.6 
            }), // +Z (front)
            new THREE.MeshStandardMaterial({ 
                color: 0x004d40, 
                metalness: 0.4, 
                roughness: 0.6 
            })  // -Z (back)
        ];
        
        const body = new THREE.Mesh(bodyGeometry, materials);
        body.castShadow = true;
        body.receiveShadow = true;
        this.satellite.add(body);
        
        // Add solar panels
        this.addSolarPanels();
        
        // Add antennas
        this.addAntennas();
        
        // Add reaction wheels (gyroscopes)
        this.addReactionWheels();
        
        // Add camera/lens
        this.addCamera();
        
        // Add thruster nozzles
        this.addThrusters();
        
        // Add the satellite to the scene
        this.scene.add(this.satellite);
    }
    
    addSolarPanels() {
        const solarMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x2e7d32,
            emissive: 0x1b5e20,
            emissiveIntensity: 0.3,
            metalness: 0.2,
            roughness: 0.8
        });
        
        // Top panel (+Y)
        const topPanel = new THREE.Mesh(
            new THREE.BoxGeometry(2.8, 0.05, 2.8),
            solarMaterial
        );
        topPanel.position.y = 1.025;
        topPanel.castShadow = true;
        this.satellite.add(topPanel);
        
        // Bottom panel (-Y)
        const bottomPanel = new THREE.Mesh(
            new THREE.BoxGeometry(2.8, 0.05, 2.8),
            solarMaterial
        );
        bottomPanel.position.y = -1.025;
        bottomPanel.castShadow = true;
        this.satellite.add(bottomPanel);
        
        // Side panels (folded)
        const sidePanelMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x1b5e20,
            emissive: 0x1b5e20,
            emissiveIntensity: 0.2,
            metalness: 0.3,
            roughness: 0.7
        });
        
        // +X side panel
        const rightPanel = new THREE.Mesh(
            new THREE.BoxGeometry(0.05, 1.8, 2.8),
            sidePanelMaterial
        );
        rightPanel.position.x = 1.025;
        rightPanel.castShadow = true;
        this.satellite.add(rightPanel);
        
        // -X side panel
        const leftPanel = new THREE.Mesh(
            new THREE.BoxGeometry(0.05, 1.8, 2.8),
            sidePanelMaterial
        );
        leftPanel.position.x = -1.025;
        leftPanel.castShadow = true;
        this.satellite.add(leftPanel);
    }
    
    addAntennas() {
        const antennaMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x616161,
            metalness: 0.8,
            roughness: 0.2
        });
        
        // UHF antenna (top center)
        const uhfAntenna = new THREE.Mesh(
            new THREE.CylinderGeometry(0.05, 0.1, 1.8, 8),
            antennaMaterial
        );
        uhfAntenna.position.y = 1.9;
        uhfAntenna.castShadow = true;
        this.satellite.add(uhfAntenna);
        
        // GPS antenna (front top)
        const gpsAntenna = new THREE.Mesh(
            new THREE.SphereGeometry(0.15, 16, 16),
            antennaMaterial
        );
        gpsAntenna.position.z = 1.1;
        gpsAntenna.position.y = 0.5;
        gpsAntenna.castShadow = true;
        this.satellite.add(gpsAntenna);
        
        // S-band antenna (back)
        const sbandAntenna = new THREE.Mesh(
            new THREE.CylinderGeometry(0.2, 0.2, 0.1, 16),
            antennaMaterial
        );
        sbandAntenna.position.z = -1.05;
        sbandAntenna.castShadow = true;
        this.satellite.add(sbandAntenna);
    }
    
    addReactionWheels() {
        const wheelMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x37474f,
            metalness: 0.9,
            roughness: 0.1
        });
        
        // X-axis reaction wheel
        const wheelX = new THREE.Mesh(
            new THREE.CylinderGeometry(0.3, 0.3, 0.6, 16),
            wheelMaterial
        );
        wheelX.rotation.z = Math.PI / 2;
        wheelX.position.x = 0.3;
        this.satellite.add(wheelX);
        
        // Y-axis reaction wheel
        const wheelY = new THREE.Mesh(
            new THREE.CylinderGeometry(0.3, 0.3, 0.6, 16),
            wheelMaterial
        );
        wheelY.position.y = 0.3;
        this.satellite.add(wheelY);
        
        // Z-axis reaction wheel
        const wheelZ = new THREE.Mesh(
            new THREE.CylinderGeometry(0.3, 0.3, 0.6, 16),
            wheelMaterial
        );
        wheelZ.rotation.x = Math.PI / 2;
        wheelZ.position.z = 0.3;
        this.satellite.add(wheelZ);
    }
    
    addCamera() {
        const cameraMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x000000,
            metalness: 0.9,
            roughness: 0.1
        });
        
        const lensMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x1a237e,
            metalness: 0.5,
            roughness: 0.3,
            transparent: true,
            opacity: 0.8
        });
        
        // Camera body
        const cameraBody = new THREE.Mesh(
            new THREE.CylinderGeometry(0.2, 0.2, 0.4, 16),
            cameraMaterial
        );
        cameraBody.position.z = 1.2;
        cameraBody.position.y = -0.3;
        this.satellite.add(cameraBody);
        
        // Camera lens
        const cameraLens = new THREE.Mesh(
            new THREE.SphereGeometry(0.15, 16, 16),
            lensMaterial
        );
        cameraLens.position.z = 1.4;
        cameraLens.position.y = -0.3;
        this.satellite.add(cameraLens);
    }
    
    addThrusters() {
        const thrusterMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x424242,
            metalness: 0.7,
            roughness: 0.3
        });
        
        // +X thruster
        const thrusterX = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.12, 0.3, 8),
            thrusterMaterial
        );
        thrusterX.position.x = 1.15;
        thrusterX.rotation.z = Math.PI / 2;
        this.satellite.add(thrusterX);
        
        // -X thruster
        const thrusterXneg = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.12, 0.3, 8),
            thrusterMaterial
        );
        thrusterXneg.position.x = -1.15;
        thrusterXneg.rotation.z = Math.PI / 2;
        this.satellite.add(thrusterXneg);
    }
    
    centerModel(model) {
        if (!model) return;
        
        // Calculate bounding box
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        // Calculate the maximum dimension
        const maxDim = Math.max(size.x, size.y, size.z);
        
        // Calculate scale to fit in view (make it slightly smaller than viewport)
        this.modelScale = 2.5 / maxDim;
        
        // Apply scale
        model.scale.setScalar(this.modelScale);
        
        // Calculate center offset after scaling
        center.multiplyScalar(this.modelScale);
        
        // Store the center offset for future reference
        this.modelCenter = {
            x: -center.x,
            y: -center.y,
            z: -center.z
        };
        
        // Center the model
        model.position.set(this.modelCenter.x, this.modelCenter.y, this.modelCenter.z);
        
        // Update controls target to model center
        if (this.controls) {
            this.controls.target.set(this.modelCenter.x, this.modelCenter.y, this.modelCenter.z);
            this.controls.update();
        }
        
        // Reposition camera to look at centered model
        this.camera.position.set(
            this.modelCenter.x + 6,
            this.modelCenter.y + 6,
            this.modelCenter.z + 6
        );
        this.camera.lookAt(this.modelCenter.x, this.modelCenter.y, this.modelCenter.z);
        
        console.log(`Model centered at (${this.modelCenter.x.toFixed(2)}, ${this.modelCenter.y.toFixed(2)}, ${this.modelCenter.z.toFixed(2)})`);
        console.log(`Scale: ${this.modelScale.toFixed(2)}, Size: ${size.x.toFixed(2)}x${size.y.toFixed(2)}x${size.z.toFixed(2)}`);
        
        return model;
    }
    
    loadModelFromURL(url, filename) {
        console.log(`📦 Loading model from: ${filename}`);
        
        const loadingIndicator = document.getElementById('model-loading');
        const loadingText = document.getElementById('loading-text');
        
        if (loadingIndicator) {
            loadingIndicator.style.display = 'block';
            loadingText.textContent = `Loading ${filename}...`;
        }
        
        // Remove existing model and axis indicators
        if (this.satellite) {
            this.scene.remove(this.satellite);
            this.satellite = null;
        }
        
        // Remove old axis indicators
        ['axis-x', 'axis-y', 'axis-z'].forEach(name => {
            const axis = this.scene.getObjectByName(name);
            if (axis) {
                this.scene.remove(axis);
            }
        });
        
        // Load GLB/GLTF model
        this.gltfLoader.load(
            url,
            (gltf) => {
                console.log('✅ Model loaded successfully!');
                
                this.satellite = gltf.scene;
                this.modelLoaded = true;
                
                // Center the model properly
                this.centerModel(this.satellite);
                
                // Add new axis indicators
                this.addAxisIndicators();
                
                // Enable shadows and enhance materials
                this.satellite.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        
                        // Enhance materials if they exist
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(mat => {
                                    mat.metalness = 0.3;
                                    mat.roughness = 0.7;
                                });
                            } else {
                                child.material.metalness = 0.3;
                                child.material.roughness = 0.7;
                            }
                        }
                    }
                });
                
                // Add the satellite to the scene
                this.scene.add(this.satellite);
                
                // Hide loading indicator
                if (loadingIndicator) {
                    loadingIndicator.style.display = 'none';
                }
                
                console.log('🎯 Custom model added and centered');
                
            },
            (xhr) => {
                // Progress callback
                if (loadingText) {
                    const percent = Math.round((xhr.loaded / xhr.total) * 100);
                    loadingText.textContent = `Loading ${filename}... ${percent}%`;
                }
            },
            (error) => {
                console.error('❌ Error loading model:', error);
                
                if (loadingIndicator) {
                    loadingIndicator.innerHTML = `
                        <div style="color: #ff5252; text-align: center; padding: 20px;">
                            <i class="fas fa-exclamation-triangle fa-2x"></i>
                            <p style="margin: 10px 0;">Error loading model</p>
                            <p style="font-size: 12px; margin-bottom: 15px;">${error.message || 'Unknown error'}</p>
                            <p>Loading default model instead...</p>
                        </div>
                    `;
                }
                
                // Load default model on error
                setTimeout(() => {
                    if (loadingIndicator) {
                        loadingIndicator.style.display = 'none';
                    }
                    this.loadDefaultModel();
                }, 2000);
            }
        );
    }
    
    updateOrientation(orientation) {
        if (!this.modelLoaded || !this.satellite) return;
        
        // Convert degrees to radians
        const rollRad = THREE.MathUtils.degToRad(orientation.roll || 0);
        const pitchRad = THREE.MathUtils.degToRad(orientation.pitch || 0);
        const yawRad = THREE.MathUtils.degToRad(orientation.yaw || 0);
        
        // Set target rotation
        this.targetRotation.x = pitchRad;  // Pitch around X-axis
        this.targetRotation.y = yawRad;    // Yaw around Y-axis
        this.targetRotation.z = -rollRad;  // Roll around Z-axis (negative for correct direction)
    }
    
    setAutoRotate(enabled) {
        this.autoRotate = enabled;
    }
    
    toggleAxes() {
        this.showAxes = !this.showAxes;
        
        // Toggle coordinate axes
        const coordAxes = this.scene.getObjectByName('coord-axes');
        if (coordAxes) {
            coordAxes.visible = this.showAxes;
        }
        
        // Toggle direction arrows
        ['axis-x', 'axis-y', 'axis-z'].forEach(name => {
            const axis = this.scene.getObjectByName(name);
            if (axis) {
                axis.visible = this.showAxes;
            }
        });
    }
    
    resetView() {
        if (this.controls) {
            this.controls.target.set(this.modelCenter.x, this.modelCenter.y, this.modelCenter.z);
            this.controls.reset();
        }
        
        // Reset camera position relative to model center
        this.camera.position.set(
            this.modelCenter.x + 8,
            this.modelCenter.y + 8,
            this.modelCenter.z + 8
        );
        this.camera.lookAt(this.modelCenter.x, this.modelCenter.y, this.modelCenter.z);
        
        this.targetRotation.x = 0;
        this.targetRotation.y = 0;
        this.targetRotation.z = 0;
        
        this.currentRotation.x = 0;
        this.currentRotation.y = 0;
        this.currentRotation.z = 0;
        
        if (this.satellite && this.modelLoaded) {
            this.satellite.rotation.x = 0;
            this.satellite.rotation.y = 0;
            this.satellite.rotation.z = 0;
        }
    }
    
    takeScreenshot() {
        if (!this.renderer) return;
        
        // Render the scene
        this.renderer.render(this.scene, this.camera);
        
        // Get the data URL
        const dataURL = this.renderer.domElement.toDataURL('image/png');
        
        // Create download link
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = `cubesat_3d_view_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('📸 Screenshot saved!');
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (this.modelLoaded && this.satellite) {
            // Smooth interpolation
            const smoothingFactor = 0.05;
            this.currentRotation.x += (this.targetRotation.x - this.currentRotation.x) * smoothingFactor;
            this.currentRotation.y += (this.targetRotation.y - this.currentRotation.y) * smoothingFactor;
            this.currentRotation.z += (this.targetRotation.z - this.currentRotation.z) * smoothingFactor;
            
            // Auto-rotation
            if (this.autoRotate) {
                this.currentRotation.y += this.rotationSpeed;
            }
            
            // Apply rotation around model center
            this.satellite.rotation.set(
                this.currentRotation.x,
                this.currentRotation.y,
                this.currentRotation.z
            );
        }
        
        // Update controls
        if (this.controls) {
            this.controls.update();
        }
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
    
    onResize() {
        const container = document.getElementById('satellite-viewer');
        if (!container) return;
        
        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
    }
}

// Initialize 3D viewer when page loads
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        try {
            window.Satellite3D = new Satellite3D();
            console.log("✅ 3D Satellite Viewer ready");
        } catch (error) {
            console.error("❌ 3D Viewer failed:", error);
            const container = document.getElementById('satellite-viewer');
            if (container) {
                container.innerHTML = `
                    <div style="color: #ff5252; text-align: center; padding: 20px;">
                        <i class="fas fa-exclamation-triangle fa-2x"></i>
                        <h3>3D Viewer Error</h3>
                        <p>${error.message}</p>
                        <p>Please check console for details</p>
                    </div>
                `;
            }
        }
    }, 1000);
});