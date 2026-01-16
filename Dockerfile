# Use a lightweight Nginx image
FROM nginx:alpine

# Copy your project files into the Nginx server directory
# Based on your structure, we copy everything to the default nginx html folder
COPY . /usr/share/nginx/html

# Expose port 80 (Cloud Run will map its port to this)
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
