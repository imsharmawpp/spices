<?php
declare(strict_types=1);

namespace App\Core;

/**
 * Tiny regex-based router. Supports path params like /api/products/{slug}.
 */
final class Router
{
    /** @var array<int, array{method:string, pattern:string, handler:callable}> */
    private array $routes = [];

    public function add(string $method, string $path, callable $handler): void
    {
        $this->routes[] = [
            'method' => strtoupper($method),
            'pattern' => $this->compile($path),
            'handler' => $handler,
        ];
    }

    public function get(string $p, callable $h): void { $this->add('GET', $p, $h); }
    public function post(string $p, callable $h): void { $this->add('POST', $p, $h); }
    public function patch(string $p, callable $h): void { $this->add('PATCH', $p, $h); }
    public function put(string $p, callable $h): void { $this->add('PUT', $p, $h); }
    public function delete(string $p, callable $h): void { $this->add('DELETE', $p, $h); }

    private function compile(string $path): string
    {
        $path = rtrim($path, '/') ?: '/';
        $regex = preg_replace('#\{([a-zA-Z_]+)\}#', '(?P<$1>[^/]+)', $path);
        return '#^' . $regex . '$#';
    }

    public function dispatch(Request $req): void
    {
        $allowed = [];
        foreach ($this->routes as $route) {
            if (preg_match($route['pattern'], $req->path, $m)) {
                if ($route['method'] !== $req->method) {
                    $allowed[] = $route['method'];
                    continue;
                }
                $params = array_filter($m, fn($k) => !is_int($k), ARRAY_FILTER_USE_KEY);
                ($route['handler'])($req, $params);
                return;
            }
        }

        if ($allowed) {
            Response::error('METHOD_NOT_ALLOWED', 'Method not allowed', 405);
        }
        Response::error('NOT_FOUND', 'Resource not found: ' . $req->path, 404);
    }
}
