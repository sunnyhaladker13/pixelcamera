document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('camera');
    const canvas = document.getElementById('output');
    const ctx = canvas.getContext('2d');
    const pixelSizeSlider = document.getElementById('pixel-size');
    const pixelSizeValue = document.getElementById('pixel-size-value');
    
    let pixelSize = parseInt(pixelSizeSlider.value);
    let streamStarted = false;

    // Update pixel size value display
    pixelSizeSlider.addEventListener('input', () => {
        pixelSize = parseInt(pixelSizeSlider.value);
        pixelSizeValue.textContent = `${pixelSize}px`;
    });

    // Function to start the camera
    async function startCamera() {
        try {
            const constraints = {
                video: {
                    facingMode: 'environment', // Use the back camera on mobile by default
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            
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

        // Draw the current video frame to the canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Get the image data from the canvas
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Create a temporary canvas to work with
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        
        // Put the original image on the temporary canvas
        tempCtx.putImageData(imageData, 0, 0);
        
        // Clear the main canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw pixelated version with gradients
        for (let y = 0; y < canvas.height; y += pixelSize) {
            for (let x = 0; x < canvas.width; x += pixelSize) {
                // Calculate the size of this pixel (handle edge cases)
                const pWidth = Math.min(pixelSize, canvas.width - x);
                const pHeight = Math.min(pixelSize, canvas.height - y);
                
                // Get the color of a single pixel in the area
                const pixelData = tempCtx.getImageData(x, y, 1, 1).data;
                
                // Create a gradient for this pixel
                const gradient = createPixelGradient(x, y, pWidth, pHeight, pixelData);
                
                // Fill the pixel area with the gradient
                ctx.fillStyle = gradient;
                ctx.fillRect(x, y, pWidth, pHeight);
                
                // Add a subtle border to each pixel for a more defined look
                ctx.strokeStyle = `rgba(${pixelData[0]}, ${pixelData[1]}, ${pixelData[2]}, 0.5)`;
                ctx.lineWidth = 1;
                ctx.strokeRect(x, y, pWidth, pHeight);
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
