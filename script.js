document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('camera');
    const canvas = document.getElementById('output');
    const ctx = canvas.getContext('2d');
    const pixelSizeSlider = document.getElementById('pixel-size');
    const pixelSizeValue = document.getElementById('pixel-size-value');
    const cameraToggleBtn = document.getElementById('camera-toggle');
    
    let pixelSize = parseInt(pixelSizeSlider.value);
    let streamStarted = false;
    let currentFacingMode = 'environment'; // Start with back camera
    let currentStream = null;
    
    // Performance optimization variables
    let frameSkip = 0;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    let processingScale = isMobile ? 0.5 : 1; // Scale down processing for mobile
    let lastFrameTime = 0;
    const targetFPS = isMobile ? 15 : 30; // Lower FPS for mobile
    const frameInterval = 1000 / targetFPS;

    // Update pixel size value display
    pixelSizeSlider.addEventListener('input', () => {
        pixelSize = parseInt(pixelSizeSlider.value);
        pixelSizeValue.textContent = `${pixelSize}px`;
    });
    
    // Add event listener for camera toggle button
    cameraToggleBtn.addEventListener('click', () => {
        // Toggle between front and back camera
        currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
        
        // Stop the current stream before switching cameras
        if (currentStream) {
            currentStream.getTracks().forEach(track => {
                track.stop();
            });
        }
        
        // Restart the camera with the new facing mode
        startCamera();
    });

    // Function to start the camera
    async function startCamera() {
        try {
            const constraints = {
                video: {
                    facingMode: currentFacingMode,
                    width: { ideal: isMobile ? 640 : 1280 },
                    height: { ideal: isMobile ? 480 : 720 }
                },
                audio: false
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            currentStream = stream;
            
            video.srcObject = stream;
            
            video.addEventListener('loadedmetadata', () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                streamStarted = true;
                animatePixelEffect();
            });
        } catch (err) {
            console.error('Error accessing camera:', err);
            alert('Could not access camera. Please make sure you have granted permission.');
        }
    }

    // Apply pixel effect to the video frame with gradient styling
    function applyPixelEffect() {
        if (!streamStarted) return;

        // Skip frames for performance optimization based on device capability
        if (frameSkip > 0) {
            frameSkip--;
            return;
        }
        frameSkip = isMobile ? 2 : 0; // Skip more frames on mobile
        
        // Check if enough time has passed since the last frame
        const now = performance.now();
        const elapsed = now - lastFrameTime;
        if (elapsed < frameInterval) return;
        lastFrameTime = now;
        
        // Create a scaled canvas for processing
        const processWidth = canvas.width * processingScale;
        const processHeight = canvas.height * processingScale;
        
        // Draw the current video frame to the canvas at reduced size for processing
        ctx.drawImage(video, 0, 0, processWidth, processHeight);
        
        // Get the image data from the canvas
        const imageData = ctx.getImageData(0, 0, processWidth, processHeight);
        const data = imageData.data;
        
        // Create a temporary canvas to work with
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = processWidth;
        tempCanvas.height = processHeight;
        
        // Put the original image on the temporary canvas
        tempCtx.putImageData(imageData, 0, 0);
        
        // Clear the main canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Adjust pixelSize based on processing scale
        const scaledPixelSize = Math.max(1, Math.floor(pixelSize * processingScale));
        
        // Draw pixelated version with simplified gradient (optimized)
        for (let y = 0; y < processHeight; y += scaledPixelSize) {
            for (let x = 0; x < processWidth; x += scaledPixelSize) {
                // Calculate the size of this pixel (handle edge cases)
                const pWidth = Math.min(scaledPixelSize, processWidth - x);
                const pHeight = Math.min(scaledPixelSize, processHeight - y);
                
                // Get the color of a single pixel in the area
                const pixelData = tempCtx.getImageData(x, y, 1, 1).data;
                
                // Use simpler rendering for better performance
                if (isMobile) {
                    // Simple solid color for mobile (much faster)
                    ctx.fillStyle = `rgb(${pixelData[0]}, ${pixelData[1]}, ${pixelData[2]})`;
                    ctx.fillRect(
                        x / processingScale, 
                        y / processingScale, 
                        pWidth / processingScale, 
                        pHeight / processingScale
                    );
                } else {
                    // Use gradient only on desktop
                    const gradient = createPixelGradient(
                        x / processingScale, 
                        y / processingScale, 
                        pWidth / processingScale, 
                        pHeight / processingScale, 
                        pixelData
                    );
                    
                    ctx.fillStyle = gradient;
                    ctx.fillRect(
                        x / processingScale, 
                        y / processingScale, 
                        pWidth / processingScale, 
                        pHeight / processingScale
                    );
                    
                    // Only add stroke on desktop for better performance
                    ctx.strokeStyle = `rgba(${pixelData[0]}, ${pixelData[1]}, ${pixelData[2]}, 0.5)`;
                    ctx.lineWidth = 1;
                    ctx.strokeRect(
                        x / processingScale, 
                        y / processingScale, 
                        pWidth / processingScale, 
                        pHeight / processingScale
                    );
                }
            }
        }
    }
    
    // Create a gradient for a pixel based on its color
    function createPixelGradient(x, y, width, height, pixelData) {
        // Extract RGB values
        const r = pixelData[0];
        const g = pixelData[1];
        const b = pixelData[2];
        
        // Choose gradient type based on color characteristics
        const brightness = (r + g + b) / 3;
        
        // Create different gradient types based on pixel brightness
        let gradient;
        
        if (brightness > 200) {
            // Light colors - radial gradient
            gradient = ctx.createRadialGradient(
                x + width/2, y + height/2, 0,
                x + width/2, y + height/2, width/1.5
            );
            gradient.addColorStop(0, `rgb(${r}, ${g}, ${b})`);
            gradient.addColorStop(1, `rgb(${Math.max(0, r-40)}, ${Math.max(0, g-40)}, ${Math.max(0, b-40)})`);
        } else if (brightness < 50) {
            // Dark colors - linear gradient from bottom-left to top-right
            gradient = ctx.createLinearGradient(
                x, y + height,
                x + width, y
            );
            gradient.addColorStop(0, `rgb(${r}, ${g}, ${b})`);
            gradient.addColorStop(1, `rgb(${Math.min(255, r+30)}, ${Math.min(255, g+30)}, ${Math.min(255, b+30)})`);
        } else {
            // Medium brightness - diagonal gradient
            gradient = ctx.createLinearGradient(
                x, y,
                x + width, y + height
            );
            gradient.addColorStop(0, `rgb(${Math.min(255, r+20)}, ${Math.min(255, g+20)}, ${Math.min(255, b+20)})`);
            gradient.addColorStop(0.5, `rgb(${r}, ${g}, ${b})`);
            gradient.addColorStop(1, `rgb(${Math.max(0, r-20)}, ${Math.max(0, g-20)}, ${Math.max(0, b-20)})`);
        }
        
        return gradient;
    }

    // Animation loop for continuous effect
    function animatePixelEffect() {
        applyPixelEffect();
        requestAnimationFrame(animatePixelEffect);
    }

    // Start the camera when the page loads
    startCamera();
});
