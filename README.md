## [raphamorim.io](http://raphamorim.io)

## How to run

I use [Jekyll](http://jekyllrb.com/), a static generator in Ruby, to create this blog.

## First steps

1. Install [Git](http://git-scm.com/downloads) and [Ruby](http://www.ruby-lang.org/pt/downloads/), in case you don't have them yet.

2. Once installed these dependencies, open up the terminal and install [Jekyll](http://jekyllrb.com/) with the following command:

  ```sh
  $ gem install jekyll jekyll-paginate jekyll-gist --user-install
  ```

3. Now clone the project:

  ```sh
  $ git clone git@github.com:raphamorim/raphamorim.github.com.git
  ```

4. Navigate to the project folder:

  ```sh
  $ cd raphamorim.github.com
  ```

5. And finally run:

  ```sh
  $ jekyll serve
  ```

You'll have access to the website at `http://0.0.0.0:4000/` :D

## Tips

Run `build` for every little or bigger change on css/js files:

  ```sh
  $ npm run build
  ```

## About

Credits: Inspired by Andy Taylor and [Zeno Rocha](http://github.com/zenorocha).

License: **MIT** License © [Raphael Amorim](http://github.com/raphamorim).
