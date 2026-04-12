FROM node:24-alpine AS build
WORKDIR /app
ARG APP_BASE_PATH=/
ENV VITE_APP_BASE_PATH=$APP_BASE_PATH
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
ARG APP_BASE_PATH=/
ENV APP_BASE_PATH=$APP_BASE_PATH
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker-entrypoint.d/40-configure-app-base.sh /docker-entrypoint.d/40-configure-app-base.sh
RUN chmod +x /docker-entrypoint.d/40-configure-app-base.sh
EXPOSE 80
