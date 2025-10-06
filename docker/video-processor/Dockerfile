# Video Processor Container with FFmpeg and Node.js 20
FROM public.ecr.aws/lambda/nodejs:20

# Install system dependencies and FFmpeg
RUN microdnf update -y && \
    microdnf install -y \
    wget \
    tar \
    xz \
    && microdnf clean all

# Install FFmpeg (static build for better compatibility)
RUN cd /tmp && \
    wget https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz && \
    tar -xf ffmpeg-release-amd64-static.tar.xz && \
    mv ffmpeg-*-amd64-static/ffmpeg /usr/local/bin/ && \
    mv ffmpeg-*-amd64-static/ffprobe /usr/local/bin/ && \
    chmod +x /usr/local/bin/ffmpeg /usr/local/bin/ffprobe && \
    rm -rf /tmp/ffmpeg-*

# Verify FFmpeg installation
RUN ffmpeg -version && ffprobe -version

# Set working directory
WORKDIR /var/task

# Copy package.json and install dependencies
COPY package.json ./
RUN npm install --production

# Copy application code
COPY video-processor.js ./

# Create directories for processing
RUN mkdir -p /tmp/video-processing/input /tmp/video-processing/output /tmp/video-processing/temp

# Set environment variables
ENV NODE_ENV=production
ENV FFMPEG_PATH=/usr/local/bin/ffmpeg
ENV FFPROBE_PATH=/usr/local/bin/ffprobe

# Run the video processor
CMD ["node", "video-processor.js"]