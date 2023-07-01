$(document).ready(function() {
    $('#terminal').terminal({
        introduction: function() {
            this.echo('Welcome to samuellbrown.dev\n');
            this.echo('Name: Samuel L. Brown');
            this.echo('Current Position: Associate Software Engineer @ ADP Bristol');
            this.echo('\nFind me on: ');
            this.echo('\n[[!;;;;https://github.com/samllbrown]GitHub]');
            this.echo('[[!;;;;https://www.linkedin.com/in/samuel-b-569810134/]LinkedIn]');
        }
    }, {
        greetings: 'Type [[b;#44D544;]introduction] to get started',
        checkArity: false
    });

    $('#terminal').terminal().exec('introduction');
});