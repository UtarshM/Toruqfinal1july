<?php
include( "ka_include/session.php" );
include( "ka_include/common_function.php" );
include( "ka_include/ka_config.php" );
include( "ka_include/check_admin_login.php" );

require( 'library/php-excel-reader/excel_reader2.php' );
require( 'library/SpreadsheetReader.php' );

if ( isset( $_POST[ 'submit_taken_excel' ] ) ) {
  $mimes = [ 'application/vnd.ms-excel', 'text/xls', 'text/xlsx', 'application/vnd.oasis.opendocument.spreadsheet' ];
  if ( in_array( $_FILES[ "file" ][ "type" ], $mimes ) ) {
    $curt_time = date('d-m-Y-h-i-s-', time());
    $uploadFilePath = 'uploads_taken_excel/' .$curt_time. basename( $_FILES[ 'file' ][ 'name' ] );
    move_uploaded_file( $_FILES[ 'file' ][ 'tmp_name' ], $uploadFilePath );
    $Reader = new SpreadsheetReader( $uploadFilePath );
    $totalSheet = count( $Reader->sheets() );
    $isheader = 0;
    /* For Loop for all sheets */
    for ( $i = 0; $i < $totalSheet; $i++ ) {
      $Reader->ChangeSheet( $i );
      foreach ( $Reader as $Row )
      {
         if ( $isheader > 0 ) {
          $tkn_series = isset( $Row[ 0 ] ) ? $Row[ 0 ] : '';

          $tkn_reg_no = isset( $Row[ 1 ] ) ? $Row[ 1 ] : '';
          $tkn_name = isset( $Row[ 2 ] ) ? $Row[ 2 ] : '';
          $tkn_contact = isset( $Row[ 3 ] ) ? $Row[ 3 ] : '';
          $tkn_vmodel = isset( $Row[ 4 ] ) ? $Row[ 4 ] : '';
          $tkn_category = isset( $Row[ 5 ] ) ? $Row[ 5 ] : '';
          $tkn_fname = isset( $Row[ 6 ] ) ? $Row[ 6 ] : '';
          $tkn_address = isset( $Row[ 7 ] ) ? $Row[ 7 ] : '';
          $tkn_chassis = isset( $Row[ 8 ] ) ? $Row[ 8 ] : '';
          $tkn_engine = isset( $Row[ 9 ] ) ? $Row[ 9 ] : '';
          $tkn_insurance_date = isset( $Row[ 10 ] ) ? $Row[ 10 ] : '';

          if(empty($tkn_insurance_date)){ $tkn_insurance_date = NULL; } else{ $tkn_insurance_date = date('Y-m-d', strtotime($tkn_insurance_date)); }
          $tkn_cf_date = isset( $Row[ 11 ] ) ? $Row[ 11 ] : '';
          
          if(empty($tkn_cf_date)){ $tkn_cf_date = NULL; } else{ $tkn_cf_date = date('Y-m-d', strtotime($tkn_cf_date)); }
          $tkn_reg_date = isset( $Row[ 12 ] ) ? $Row[ 12 ] : '';
          
          if(empty($tkn_reg_date)){ $tkn_reg_date = NULL; } else{ $tkn_reg_date = date('Y-m-d', strtotime($tkn_reg_date)); }
          $tkn_permit_date = isset( $Row[ 13 ] ) ? $Row[ 13 ] : '';
          
          if(empty($tkn_permit_date)){ $tkn_permit_date = NULL; } else{ $tkn_permit_date = date('Y-m-d', strtotime($tkn_permit_date)); }
          $tkn_nat_permit_date = isset( $Row[ 14 ] ) ? $Row[ 14 ] : '';
          
          if(empty($tkn_nat_permit_date)){ $tkn_nat_permit_date = "NULL"; } else{ $tkn_nat_permit_date = date('Y-m-d', strtotime($tkn_nat_permit_date)); }
          $tkn_tax_date = isset( $Row[ 15 ] ) ? $Row[ 15 ] : '';
          
          if(empty($tkn_tax_date)){ $tkn_tax_date = NULL; } else{ $tkn_tax_date = date('Y-m-d', strtotime($tkn_tax_date)); }
          $tkn_qut_date = isset( $Row[ 16 ] ) ? $Row[ 16 ] : '';
          
          if(empty($tkn_qut_date)){ $tkn_qut_date = NULL; } else{ $tkn_qut_date = date('Y-m-d', strtotime($tkn_qut_date)); }
          $tkn_remarks = isset( $Row[ 17 ] ) ? $Row[ 17 ] : '';
          // echo $tkn_nat_permit_date; exit;
          $s_max = "SELECT MAX( tkn_id ) AS max FROM `taken_detail`";
          $result_max = $con->query($s_max);
          $row_max = $result_max->fetch_object();
          $max_tkn_id = $row_max->max + 1;
          $tkn_code_no = "TKN".$max_tkn_id;
          $query_tkn_dup = "SELECT * FROM taken_detail where tkn_reg_no='".$tkn_reg_no."' and tkn_insurance_date='".$tkn_insurance_date."' and tkn_status!='3' and tkn_action!='3'";
          $result_tkn_dup = $con->query( $query_tkn_dup );
          $total_records_tkn_dup = $result_tkn_dup->num_rows;
          // echo $total_records_tkn_dup; exit;
          if ( $total_records_tkn_dup >= 1 ) {
            // echo "ALREADY EXIST";
            
            $tkn_date = date( 'Y-m-d H:i:s' );
            $updated_by = $_SESSION[ 'adm_id' ];
            $updated_date = date( 'Y-m-d H:i:s' );
            if($tkn_series!="" && $tkn_name!="" && $tkn_vmodel!="" && $tkn_reg_no!="") {
            // UPDATE RECORD 
            $sql_expe_updt = "UPDATE taken_detail SET tkn_date='" . $tkn_date . "', tkn_series='" . $tkn_series."', tkn_name='" . $tkn_name."', tkn_fname='" . $tkn_fname."', tkn_address='" . $tkn_address."', tkn_chassis='" . $tkn_chassis."', tkn_engine='" . $tkn_engine."', tkn_contact='".$tkn_contact."', tkn_category='".$tkn_category."', tkn_reg_no='".$tkn_reg_no."', tkn_vmodel='".$tkn_vmodel."', tkn_insurance_date='" . $tkn_insurance_date . "', tkn_cf_date='" . $tkn_cf_date . "', tkn_reg_date='" . $tkn_reg_date . "', tkn_permit_date='" . $tkn_permit_date . "', tkn_nat_permit_date='" . $tkn_nat_permit_date . "', tkn_tax_date='" . $tkn_tax_date . "', tkn_qut_date='" . $tkn_qut_date . "',   tkn_remarks='".$tkn_remarks."', updated_by='" . $updated_by . "', updated_date='" . $updated_date . "' WHERE tkn_reg_no='".$tkn_reg_no."'";
            $con->query( $sql_expe_updt );
            }

            // UPDATE RECORD 
          } else {
            // echo "New";
            // INSERT RECORD
            $tkn_adm_id=0;
            $branch_id = $_SESSION[ 'adm_branch' ];
            $tkn_status = 1;
            $tkn_action = 1;
            $tkn_date = date( 'Y-m-d H:i:s' );
            $added_date = date( 'Y-m-d H:i:s' );
            $updated_date = date( 'Y-m-d H:i:s' );
            $added_by = $_SESSION[ 'adm_id' ];
            $updated_by = $_SESSION[ 'adm_id' ];
            if($tkn_series!="" && $tkn_name!="" && $tkn_vmodel!="" && $tkn_reg_no!="") {
            $sql_expe_ins = "INSERT INTO taken_detail (tkn_adm_id, branch_id, tkn_code_no,  tkn_date, tkn_series, tkn_name, tkn_fname, tkn_address, tkn_chassis, tkn_engine, tkn_contact, tkn_reg_no, tkn_vmodel, tkn_category, tkn_insurance_date, tkn_cf_date, tkn_reg_date, tkn_permit_date, tkn_nat_permit_date, tkn_tax_date, tkn_qut_date,  tkn_remarks, added_by, updated_by, tkn_status, tkn_action, added_date, updated_date) VALUES ('" . $tkn_adm_id . "','" . $branch_id . "','" . $tkn_code_no . "','" . $tkn_date . "','" . $tkn_series . "','" . $tkn_name . "','" . $tkn_fname . "','" . $tkn_address . "','" . $tkn_chassis . "','" . $tkn_engine . "','" . $tkn_contact . "','" . $tkn_reg_no . "','" . $tkn_vmodel . "','" . $tkn_category . "','" . $tkn_insurance_date . "','" . $tkn_cf_date . "','" . $tkn_reg_date . "','" . $tkn_permit_date . "','" . $tkn_nat_permit_date . "','" . $tkn_tax_date . "','" . $tkn_qut_date . "', '" . $tkn_remarks . "','" . $added_by . "','" . $updated_by . "','" . $tkn_status . "', '" . $tkn_action . "','" . $added_date . "','" . $updated_date . "')";
            $con->query( $sql_expe_ins );
            }
            // INSERT RECORD
          }
        } else {
          $isheader = 1;
        }
        
      }
      // exit;
    }
    header('Location: taken_view.php?flag=1');
  } else {
    header('Location: taken_view.php?flag=4');
  }
}
?>