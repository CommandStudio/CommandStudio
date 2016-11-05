define( [
  "compiler/cserror"
], function(
  CSError
) {

  var symbols = [
    { name: "eol", pattern: /\n/ },

    { name: ":", pattern: /:/ },
    { name: "~", pattern: /~/ },
    { name: ".", pattern: /\./ },

    { name: "=", pattern: /=/ },
    { name: "+", pattern: /\+/ },
    { name: "-", pattern: /-/ },

    { name: "spaces", pattern: /[ \t]+/ },
    { name: "number", pattern: /\d+/ },
    { name: "keyword", pattern: /(?:chain|var)\b/ },
    { name: "var", pattern: /\$\w+/ }
  ];

  function Parser( input ) {
    if( typeof input === "string" ) this.tokens = this.parseTokens( input );
    this.pos = 0;
    this.saves = [];
    this.setPos( 0 );
  }

  Parser.prototype.parseTokens = function( code ) {
    var tokens = [],
      nextToken, nextTokenPosition, match;

    while( code !== "" ) {
      nextToken = null;

      symbols.forEach( function( symbol ) {
        match = code.match( symbol.pattern );
        if( match !== null && ( nextToken === null || nextTokenPosition > match.index ) ) {
          nextToken = { type: symbol.name, value: match[0] };
          nextTokenPosition = match.index;
        }
      } );

      if( nextToken === null ) {
        tokens.push( { type: "text", value: code } );
        break;
      }

      if( nextTokenPosition > 0 ) {
        tokens.push( { type: "text", value: code.substr( 0, nextTokenPosition ) } );
      }

      if( nextToken !== null ) {
        if( nextToken.type === "escaped" ) {
          nextToken = { type: "text", value: nextToken.value.substr( 1 ) };
          nextTokenPosition += 1;
        }
        tokens.push( nextToken );
      }

      code = code.substr( nextTokenPosition + nextToken.value.length );
    }

    tokens.push( { type: "eol", value: null } );
    tokens.push( { type: "eos", value: null } );

    return this.cleanTokens( tokens );
  };

  Parser.prototype.cleanTokens = function( rawTokens ) {
    // TODO: remove trailing spaces
    var tokens = [],
      buffer = [];

    for( var i = 0, l = rawTokens.length ; i < l ; i++ ) {
      var rawToken = rawTokens[i];

      if( buffer.length > 0 ) {
        if( rawToken.type === "eol" ) {
          buffer = [ buffer[0] ];
        }
        else if( rawToken.type === "spaces" ) {
          buffer.push( rawToken );
        }
        else {
          tokens = tokens.concat( buffer );
          tokens.push( rawToken );
          buffer = [];
        }
      }
      else if( rawToken.type === "eol" ) {
        buffer.push( rawToken );
      }
      else {
        tokens.push( rawToken );
      }
    }

    return tokens;
  };

  Parser.prototype.setPos = function( pos ) {
    this.pos = pos;
    this.current = this.tokens[ this.pos ];
  };

  Parser.prototype.save = function() {
    this.saves.push( this.pos );
  };

  Parser.prototype.popSave = function() {
    return this.saves.pop();
  };

  Parser.prototype.restore = function() {
    this.setPos( this.popSave() );
  };

  Parser.prototype.eos = function() {
    return this.current.type === "eos";
  };

  Parser.prototype.eol = function() {
    return this.current.type === "eol" || this.eos();
  };

  Parser.prototype.next = function() {
    this.setPos( this.pos + 1 );
  };

  Parser.prototype.require = function( tokenType, tokenValue ) {
    var currentToken = this.current;
    if( currentToken.type !== tokenType || tokenValue != null && currentToken.value !== tokenValue ) {
      throw new CSError( "UNEXPECTED_TOKEN", currentToken.type );
    }
  };

  Parser.prototype.eat = function( tokenType, tokenValue ) {
    var currentToken = this.current;
    this.require( tokenType, tokenValue );
    this.next();
    return currentToken;
  };

  Parser.prototype.skip = function( tokenType ) {
    while( this.current.type === tokenType ) this.next();
  };

  return Parser;

} );