import argparse
import os
import os.path

from hermit_tube.frontend import render
from hermit_tube.scraper import scraper


def run_wsgi_server(args):
    from hermit_tube.backend import app
    app.run(debug=True, use_reloader=False)


def run_worker(args):
    from hermit_tube.worker.worker import loop
    loop()


def run_compress(args):
    from hermit_tube.lib.trends import compress_trends
    compress_trends([
        # after 1 week, keep hourly
        (7 * 24 * 3600, 3600),
        # after 1 month, keep daily
        (30 * 24 * 3600, 24 * 3600),
    ])


SUBCOMMANDS = {
    'frontend': render,
    'scraper': scraper,
    'backend': run_wsgi_server,
    'worker': run_worker,
    'compress': run_compress,
}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--directory', '-d',  help='Work directory for configuration/output')
    subparsers = parser.add_subparsers(dest='subparser')

    for name, module in list(SUBCOMMANDS.items()):
        subparser = subparsers.add_parser(name)
        if hasattr(module, 'build_argparser'):
            SUBCOMMANDS[name] = module.main
            module.build_argparser(subparser)

    args = parser.parse_args()
    if not args.subparser:
        parser.print_help()
    elif args.subparser in SUBCOMMANDS:
        if args.directory:
            os.chdir(args.directory)
        SUBCOMMANDS[args.subparser](args)
    else:
        raise ValueError(f'Unrecognized argument: {args.subparser}')

if __name__ == "__main__":
    main()
